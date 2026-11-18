import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const base = process.env.WEB_BASE_URL ?? "http://127.0.0.1:5173";

test(
  "live React UI, Chart.js, responsive layouts, navigation and request states",
  { timeout: 120_000 },
  async () => {
    const profile = await mkdtemp(join(tmpdir(), "g-scores-chrome-"));
    const screenshots = join(tmpdir(), "g-scores-ui");
    const chrome = spawn(
      process.env.CHROME_BIN ?? "google-chrome",
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-extensions",
        "--remote-debugging-port=0",
        "--user-data-dir=" + profile,
        "about:blank",
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let socket: WebSocket | undefined;
    const errors: string[] = [];
    try {
      const endpoint: string = await new Promise((resolve, reject) => {
        let log = "";
        const timer = setTimeout(
          () => reject(new Error("Chrome startup timed out")),
          15_000,
        );
        chrome.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        chrome.once("exit", (code) => {
          clearTimeout(timer);
          reject(new Error("Chrome exited: " + code));
        });
        chrome.stderr.on("data", (buffer) => {
          log += buffer;
          const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
          if (match) {
            clearTimeout(timer);
            resolve(match[1]);
          }
        });
      });
      const pages = await (
        await fetch("http://127.0.0.1:" + new URL(endpoint).port + "/json/list")
      ).json();
      socket = new WebSocket(
        pages.find((page: { type: string }) => page.type === "page")
          .webSocketDebuggerUrl,
      );
      await new Promise<void>((resolve, reject) => {
        socket!.addEventListener("open", () => resolve(), { once: true });
        socket!.addEventListener("error", reject, { once: true });
      });
      let id = 0;
      const pending = new Map<
        number,
        {
          resolve: (value: any) => void;
          reject: (error: Error) => void;
          timer: ReturnType<typeof setTimeout>;
        }
      >();
      const send = (method: string, params: object = {}): Promise<any> =>
        new Promise((resolve, reject) => {
          const current = ++id;
          const timer = setTimeout(() => {
            pending.delete(current);
            reject(new Error("CDP timed out: " + method));
          }, 15_000);
          pending.set(current, { resolve, reject, timer });
          socket!.send(JSON.stringify({ id: current, method, params }));
        });
      let mock: "error" | "empty" | "slow" | null = null;
      const levels = await (await fetch(base + "/api/reports/levels")).json();
      const ranking = await (await fetch(base + "/api/reports/combinations/A00")).json();
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.id) {
          const handler = pending.get(message.id);
          if (handler) {
            pending.delete(message.id);
            clearTimeout(handler.timer);
            message.error
              ? handler.reject(new Error(JSON.stringify(message.error)))
              : handler.resolve(message.result);
          }
        } else if (message.method === "Runtime.exceptionThrown")
          errors.push(message.params.exceptionDetails.text);
        else if (message.method === "Fetch.requestPaused") {
          const paused = message.params;
          const mode = mock;
          void (async () => {
            if (mode === "slow")
              await new Promise((resolve) => setTimeout(resolve, 500));
            if (mode === "error")
              await send("Fetch.fulfillRequest", {
                requestId: paused.requestId,
                responseCode: 503,
                responseHeaders: [
                  { name: "Content-Type", value: "application/json" },
                ],
                body: Buffer.from(
                  JSON.stringify({ message: "Test connection unavailable." }),
                ).toString("base64"),
              });
            else if (mode === "empty")
              await send("Fetch.fulfillRequest", {
                requestId: paused.requestId,
                responseCode: 200,
                responseHeaders: [
                  { name: "Content-Type", value: "application/json" },
                ],
                body: Buffer.from(
                  JSON.stringify({ ...levels, total: 0, ready: false }),
                ).toString("base64"),
              });
            else
              await send("Fetch.continueRequest", {
                requestId: paused.requestId,
              });
          })().catch((error) => {
            // StrictMode aborts its first request; Chrome invalidates that interception ID.
            if (!String(error).includes("Invalid InterceptionId")) errors.push(String(error));
          });
        }
      });
      const evaluate = async (expression: string): Promise<any> => {
        const result = await send("Runtime.evaluate", {
          expression,
          returnByValue: true,
          awaitPromise: true,
        });
        if (result.exceptionDetails)
          throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
      };
      const wait = async (expression: string) => {
        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline) {
          if (await evaluate(expression)) return;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error("Condition not met: " + expression);
      };
      const navigate = async (route: string) => {
        await send("Page.navigate", { url: base + route });
        await wait('!!document.querySelector("main .eyebrow")');
      };
      const ready = async (route: string) => {
        await navigate(route);
        await wait(
          '!document.querySelector("main [aria-busy=true]") && !!document.querySelector("main .metrics article, main canvas, #sbd")',
        );
      };
      const screenshot = async (name: string) => {
        const metrics = await send("Page.getLayoutMetrics");
        const shot = await send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: true,
          clip: {
            x: 0,
            y: 0,
            width: metrics.cssContentSize.width,
            height: metrics.cssContentSize.height,
            scale: 1,
          },
        });
        await writeFile(
          join(screenshots, name + ".png"),
          Buffer.from(shot.data, "base64"),
        );
      };
      await mkdir(screenshots, { recursive: true });
      await send("Runtime.enable");
      await send("Page.enable");
      await send("Page.addScriptToEvaluateOnNewDocument", {
        source: `
          const fillText = CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
            (this.canvas.renderedText ??= new Set()).add(String(text));
            return fillText.call(this, text, ...args);
          };
        `,
      });
      for (const [width, height, prefix] of [
        [1440, 1000, "desktop"],
        [768, 1024, "tablet"],
        [390, 844, "mobile"],
      ] as const) {
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: prefix === "mobile",
        });
        for (const [route, name] of [
          ["/", "overview"],
          ["/scores", "scores"],
          ["/reports", "reports"],
          ["/rankings", "rankings"],
        ]) {
          await ready(route);
          assert.equal(
            await evaluate(
              'document.querySelectorAll("nav a[aria-current=page]").length',
            ),
            1,
          );
          assert.ok(
            await evaluate(
              "document.documentElement.scrollWidth <= innerWidth",
            ),
            prefix + " overflow on " + route,
          );
          if (route === "/") {
            assert.equal(
              await evaluate('document.querySelectorAll("main canvas, main table, #subject-filter, #group-filter").length'),
              0,
            );
            assert.deepEqual(
              await evaluate('[...document.querySelectorAll("main .metrics article strong")].map(el => el.textContent)'),
              [
                levels.total,
                levels.subjects.length,
                levels.subjects.reduce((sum: number, s: { valid: number }) => sum + s.valid, 0),
                levels.subjects.reduce((sum: number, s: { missing: number }) => sum + s.missing, 0),
              ].map((value) => new Intl.NumberFormat("en-US").format(value)),
            );
            assert.equal(
              await evaluate('performance.getEntriesByType("resource").some(r => ["/api/subjects", "/api/combinations", "/api/reports/combinations/"].some(path => r.name.includes(path)))'),
              false,
              "Dashboard must not request page-specific metadata or rankings",
            );
          } else if (route !== "/scores") {
            await wait(
              '[...document.querySelectorAll("main canvas")].every(c => c.renderedText?.size > 0)',
            );
            const rendered = await evaluate(
              '[...document.querySelectorAll("main canvas")].map(c => [...c.renderedText])',
            );
            const bins = route === "/reports" ? levels.subjects[0].bins : ranking.bins;
            for (const bin of bins) {
              const label = `[${bin.lowerBound.toFixed(2)}; ${bin.upperBound.toFixed(2)}${bin.upperInclusive ? "]" : ")"}`;
              assert.ok(rendered[0].includes(label), prefix + " missing interval " + label + " on " + route);
            }
            if (route === "/reports") {
              assert.ok(rendered[1].includes("Candidates"), "Score bands must show candidate counts");
              assert.ok(!rendered[1].includes("Share of valid scores (%)"));
            }
          } else {
            await evaluate(
              'document.querySelector("#lookup-form button[type=button]").click()',
            );
            await wait('!!document.getElementById("result-sbd")');
            assert.equal(
              await evaluate(
                'document.getElementById("result-sbd").textContent',
              ),
              "01000001",
            );
            assert.ok(
              await evaluate(
                'document.getElementById("lookup-result").textContent.includes("Not taken")',
              ),
            );
          }
          if (prefix !== "tablet") await screenshot(prefix + "-" + name);
        }
      }
      await ready("/?subject=unknown&group=unknown");
      assert.equal(
        await evaluate('document.querySelectorAll("main .metrics article").length'),
        4,
      );
      await evaluate(`document.querySelector('nav a[href="/reports"]').click()`);
      await wait('document.querySelectorAll("main canvas").length === 2');
      await evaluate('history.back()');
      await wait('document.querySelectorAll("main .metrics article").length === 4 && document.querySelectorAll("main canvas").length === 0');
      await evaluate('history.forward()');
      await wait('document.querySelectorAll("main canvas").length === 2');
      await navigate("/reports?subject=unknown");
      await wait('document.querySelector("main").textContent.includes("Unknown subject.")');
      assert.equal(await evaluate('document.querySelectorAll("main canvas").length'), 0);
      await ready("/reports");
      for (const subject of levels.subjects) {
        await evaluate(
          `document.getElementById('subject-filter').focus();document.getElementById('subject-filter').value=${JSON.stringify(subject.key)};document.getElementById('subject-filter').dispatchEvent(new Event('change',{bubbles:true}))`,
        );
        await wait(
          `document.querySelector('main').textContent.includes(${JSON.stringify(subject.name + " score distribution")})`,
        );
        assert.equal(
          await evaluate("document.activeElement.id"),
          "subject-filter",
        );
        assert.ok(
          await evaluate(
            '!document.querySelector("main").textContent.includes("NaN")',
          ),
        );
      }
      await ready("/rankings");
      for (const group of ["A00", "A01", "B00", "C00", "D01", "D07"]) {
        await evaluate(`document.getElementById('tab-${group}').click()`);
        await wait(
          `!!document.querySelector('main canvas') && document.querySelector('main').textContent.includes('Top 10 candidates · ${group}')`,
        );
        assert.equal(
          await evaluate(
            'document.querySelectorAll("main section:last-child tbody tr").length',
          ),
          10,
        );
      }
      const leader = await evaluate(
        'document.querySelector("main section:last-child tbody a").textContent',
      );
      await evaluate(
        'document.querySelector("main section:last-child tbody a").click()',
      );
      await wait('!!document.getElementById("result-sbd")');
      assert.equal(
        await evaluate('document.getElementById("result-sbd").textContent'),
        leader,
      );
      await ready("/scores");
      await evaluate('document.getElementById("sbd").focus()');
      for (const type of ["keyDown", "keyUp"])
        await send("Input.dispatchKeyEvent", {
          type,
          key: "Enter",
          code: "Enter",
          windowsVirtualKeyCode: 13,
          ...(type === "keyDown" ? { text: "\r" } : {}),
        });
      assert.equal(
        await evaluate(
          'document.getElementById("sbd").getAttribute("aria-invalid")',
        ),
        "true",
      );
      assert.equal(await evaluate("document.activeElement.id"), "sbd");
      // Use native input events so React receives the same value changes as user typing.
      await send("Input.insertText", { text: "123" });
      await evaluate('document.getElementById("lookup-form").requestSubmit()');
      assert.equal(
        await evaluate(
          'document.getElementById("sbd").getAttribute("aria-invalid")',
        ),
        "true",
      );
      await evaluate('document.getElementById("sbd").select()');
      await send("Input.insertText", { text: "99999999" });
      await evaluate('document.getElementById("lookup-form").requestSubmit()');
      await wait(
        'document.querySelector("#lookup-result").textContent.includes("Registration number not found.")',
      );
      await evaluate('document.querySelector("#lookup-result button").click()');
      assert.equal(await evaluate("document.activeElement.id"), "sbd");
      await ready("/scores?sbd=01003254");
      await wait('!!document.getElementById("result-sbd")');
      assert.ok(
        await evaluate(
          'document.getElementById("lookup-result").textContent.includes("0.00")',
        ),
      );
      await ready("/scores?sbd=01000002");
      await wait('!!document.getElementById("result-sbd")');
      assert.equal(
        await evaluate('document.getElementById("result-sbd").textContent'),
        "01000002",
      );
      await send("Fetch.enable", {
        patterns: [{ urlPattern: "*api/reports/levels*" }],
      });
      for (const route of ["/", "/reports"]) {
        mock = "slow";
        await navigate(route);
        await wait('!!document.querySelector("main [aria-busy=true]")');
        await wait('!!document.querySelector("main .metrics article")');
        mock = "empty";
        await navigate(route);
        await wait(
          'document.querySelector("main").textContent.includes("No data for 2024 yet.")',
        );
        assert.equal(
          await evaluate('document.querySelectorAll("main canvas, main .metrics article").length'),
          0,
        );
        mock = "error";
        await navigate(route);
        await wait(
          'document.querySelector("main").textContent.includes("Unable to load data.")',
        );
        assert.equal(await evaluate('document.querySelectorAll("main canvas").length'), 0);
        mock = null;
        await evaluate(
          '[...document.querySelectorAll("main button")].find(b=>b.textContent==="Retry").click()',
        );
        await wait(
          '!document.querySelector("main [role=alert]") && document.querySelectorAll("main .metrics article").length === 4',
        );
        assert.equal(
          await evaluate('document.querySelectorAll("main canvas").length'),
          route === "/" ? 0 : 2,
        );
      }
      await send("Fetch.disable");
      await navigate("/unknown");
      assert.ok(
        await evaluate(
          'document.querySelector("main").textContent.includes("Back to dashboard")',
        ),
      );
      assert.equal(await evaluate("document.documentElement.lang"), "en");
      assert.deepEqual(errors, []);
      const css = await readFile(
        new URL("../apps/web/src/styles/globals.css", import.meta.url),
        "utf8",
      );
      assert.ok(css.includes('@import "tailwindcss"'));
      console.log(
        "PASS 4 routes at 1440/768/390px, every histogram interval label, candidate-count bands, 9 subjects, 6 combinations, real lookup, validation, zero/missing/not-found, loading/empty/error/retry, summary-only dashboard and page-specific requests.",
      );
      console.log("Screenshots: " + screenshots);
    } finally {
      socket?.close();
      chrome.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        if (chrome.exitCode !== null) resolve();
        else {
          chrome.once("exit", () => resolve());
          setTimeout(resolve, 3000).unref();
        }
      });
      await rm(profile, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 200,
      });
    }
  },
);
