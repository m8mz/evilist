import { test, expect } from "@playwright/test";

test.describe("hero", () => {
  test("introduces Marcus with a prompt, a title, the location and two actions", async ({
    page,
  }) => {
    await page.goto("/");
    const hero = page.locator(".hero");
    await expect(hero.locator(".prompt__path")).toHaveText("marcus");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Marcus Hancock-Gaillard");
    await expect(hero.locator(".hero__title .visually-hidden")).toHaveText("Sr. Systems Architect");
    await expect(hero.locator(".hero__location")).toHaveText("Mesa, Arizona");
    await expect(hero.locator(".hero__pitch")).toHaveText(
      /^(A decade|Over a decade) in Linux infrastructure\./,
    );
    await expect(hero.locator(".kv__key")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "See the journey" })).toHaveAttribute(
      "href",
      "#journey",
    );
    await expect(page.getByRole("link", { name: "Read the resume" })).toHaveAttribute(
      "href",
      "/resume",
    );
  });

  test("runs the site's htop behind the copy, dimmed, instead of a band", async ({ page }) => {
    await page.goto("/");
    const pane = page.locator(".hero__pane--term");
    await expect(pane).toHaveAttribute("aria-hidden", "true");
    await expect(pane.locator("[data-htop] tbody tr")).toHaveCount(24);
    const opacity = Number(await pane.evaluate((el) => getComputedStyle(el).opacity));
    expect(opacity).toBeGreaterThan(0.1);
    expect(opacity).toBeLessThan(0.4);
    await expect(page.locator("#system")).toHaveCount(0);
    await expect(page.getByText(/simulated htop/)).toHaveCount(0);
  });

  for (const width of [0, 960]) {
    test(`splits the hero like tmux, and no copy crosses the divider${width ? ` (${width}px)` : ""}`, async ({
      page,
    }, info) => {
      if (width) {
        test.skip(info.project.name !== "desktop", "one extra width, on desktop");
        await page.setViewportSize({ width, height: 900 });
      }
      await page.goto("/");
      const net = (await page.locator(".hero__pane--net").boundingBox())!;
      const sideBySide = page.viewportSize()!.width >= 960;
      // Inline boxes (surname, title) measure the text itself, overflow included.
      for (const sel of [".hero__surname", ".hero__title-text", ".hero__pitch", ".hero__actions"]) {
        const box = (await page.locator(sel).boundingBox())!;
        if (sideBySide) expect(box.x + box.width, sel).toBeLessThanOrEqual(net.x + 1);
        else expect(box.y + box.height, sel).toBeLessThanOrEqual(net.y + 1);
      }
      const portrait = (await page.locator(".hero__portrait").boundingBox())!;
      if (sideBySide) expect(portrait.x).toBeGreaterThanOrEqual(net.x);
      else expect(portrait.y).toBeGreaterThanOrEqual(net.y);
    });
  }

  test("keeps the surname, and every title, on one line inside the copy column", async ({
    page,
  }) => {
    await page.goto("/");
    expect(await page.locator(".hero__surname").evaluate((el) => el.getClientRects().length)).toBe(
      1,
    );
    const overflow = await page.evaluate(() => {
      const column = document.querySelector(".hero__text")!.getBoundingClientRect();
      const el = document.querySelector<HTMLElement>("[data-title-rotator]")!;
      const titles = JSON.parse(el.dataset.titles!) as string[];
      const original = el.textContent;
      const bad = titles.filter((t) => {
        el.textContent = t;
        const r = el.getBoundingClientRect();
        return el.getClientRects().length !== 1 || r.right > column.right + 1;
      });
      el.textContent = original;
      return bad;
    });
    expect(overflow).toEqual([]);
  });

  test("frames the portrait as a terminal window with the S-rank chip", async ({ page }) => {
    await page.goto("/");
    const frame = page.locator(".hero .term");
    await expect(frame.locator(".term__title")).toHaveText("marcus@evilist:~");
    await expect(frame.getByRole("img", { name: "S-rank: Sr. Systems Architect" })).toHaveCount(1);
    await expect(page.locator(".hero .seal")).toHaveCount(0);
  });

  test("keeps the portrait's LCP hints and intrinsic size", async ({ page }) => {
    await page.goto("/");
    const img = page.locator(".hero img");
    await expect(img).toHaveAttribute("loading", "eager");
    await expect(img).toHaveAttribute("fetchpriority", "high");
    await expect(img).toHaveAttribute("width", /^\d+$/);
    await expect(img).toHaveAttribute("height", /^\d+$/);
  });
});

test.describe("infrastructure diagram", () => {
  test("describes the topology once, through its caption", async ({ page }) => {
    await page.goto("/");
    const figure = page.locator("figure.work__topology");
    await expect(figure.locator("figcaption")).toHaveText(
      "two datacenters, BGP failover, HAProxy in front",
    );
    await expect(figure.locator("svg.topo")).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("img", { name: /BGP failover/ })).toHaveCount(0);
  });

  test("keeps the topology labels readable on every screen", async ({ page }) => {
    await page.goto("/");
    const px = await page
      .locator(".topo__label")
      .first()
      .evaluate((el) => {
        const svg = (el as SVGTextElement).ownerSVGElement!;
        const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
        return parseFloat(getComputedStyle(el).fontSize) * scale;
      });
    expect(px).toBeGreaterThanOrEqual(11);
  });

  test("moves the pulse only when motion is allowed", async ({ page }, info) => {
    await page.goto("/");
    const name = await page
      .locator(".topo__pulse")
      .evaluate((el) => getComputedStyle(el).animationName);
    if (info.project.name === "reduced-motion") expect(name).toBe("none");
    else expect(name).not.toBe("none");
  });
});

test.describe("rotating title", () => {
  test("moves on to the next title, and holds still under reduced motion", async ({
    page,
  }, info) => {
    await page.goto("/");
    const title = page.locator("[data-title-rotator]");
    await expect(title).toHaveText("Sr. Systems Architect");
    if (info.project.name === "reduced-motion") {
      await page.waitForTimeout(5000);
      await expect(title).toHaveText("Sr. Systems Architect");
      await expect(title).toHaveCSS("opacity", "1");
      await expect(title).toHaveCSS("animation-name", "none");
    } else {
      await expect(title).toHaveText("Forward Deployed Engineer", { timeout: 6000 });
    }
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("shows the current role, still", async ({ page }) => {
      await page.goto("/");
      const title = page.locator("[data-title-rotator]");
      await expect(title).toHaveText("Sr. Systems Architect");
      await expect(title).toHaveCSS("animation-name", "none");
      await expect(title).toHaveCSS("opacity", "1");
    });
  });
});

test.describe("portrait tilt", () => {
  test.beforeEach(({}, info) => {
    test.skip(!["desktop", "reduced-motion"].includes(info.project.name), "fine pointers only");
  });

  test("tilts toward the cursor, springs back when it leaves, and never under reduced motion", async ({
    page,
  }, info) => {
    await page.goto("/");
    const portrait = page.locator("[data-tilt]");
    const transform = () => portrait.evaluate((el) => getComputedStyle(el).transform);
    const hero = (await page.locator(".hero").boundingBox())!;
    await page.mouse.move(hero.x + 40, hero.y + 40, { steps: 4 });
    if (info.project.name === "reduced-motion") {
      await page.waitForTimeout(800);
      expect(await transform()).toBe("none");
      return;
    }
    await expect.poll(transform).toMatch(/^matrix3d\(/);
    await page.mouse.move(hero.x + 10, 10); // onto the header: the pointer leaves the hero
    await expect.poll(transform).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  });
});

test.describe("off the clock", () => {
  test("shows the rig, what's playing and what's on, with a link to /now", async ({ page }) => {
    await page.goto("/");
    const block = page.locator("#off-the-clock");
    await expect(block.locator(".prompt__path")).toHaveText("off-the-clock");
    await expect(block.getByRole("heading", { level: 3 })).toHaveText([
      "rig",
      "playing",
      "watching",
    ]);
    await expect(block).toContainText("MacBook Pro (M2 Max)");
    await expect(block).toContainText("Old School RuneScape");
    await expect(block).toContainText("Solo Leveling");
    await expect(block.getByRole("img", { name: "Illustrative training rhythm" })).toBeVisible();
    await expect(block.getByRole("link", { name: "more on /now" })).toHaveAttribute("href", "/now");
  });
});

test.describe("stack network", () => {
  /** A labelled node whose dot is inside the visible network pane, in page coordinates. */
  const visibleNode = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const pane = document.querySelector(".hero__pane--net")!.getBoundingClientRect();
      for (const g of document.querySelectorAll<SVGGElement>(".net__node--labelled")) {
        const r = g.querySelector("circle")!.getBoundingClientRect();
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        const inside =
          x > pane.left + 12 &&
          x < pane.right - 12 &&
          y > pane.top + 12 &&
          y < Math.min(pane.bottom, innerHeight) - 12;
        if (inside) return { id: g.dataset.netNode!, x, y };
      }
      throw new Error("no labelled node on screen");
    });

  test.describe("under a mouse", () => {
    test.beforeEach(({}, info) => {
      test.skip(!["desktop", "reduced-motion"].includes(info.project.name), "needs a mouse");
    });

    test("lights the node under the cursor with its neighbours, and clears when it leaves", async ({
      page,
    }) => {
      await page.goto("/");
      const node = await visibleNode(page);
      await page.mouse.move(node.x, node.y, { steps: 3 });
      await expect(page.locator(`[data-net-node="${node.id}"]`)).toHaveClass(/is-source/);
      expect(await page.locator(".net__node.is-lit").count()).toBeGreaterThan(1);
      expect(await page.locator(".net__edge.is-lit").count()).toBeGreaterThan(0);
      await page.mouse.move(node.x, 10); // onto the header
      await expect(page.locator(".net__node.is-lit")).toHaveCount(0);
    });

    test("still finds the node after a resize", async ({ page }) => {
      await page.goto("/");
      await page.setViewportSize({ width: 1180, height: 820 });
      const node = await visibleNode(page);
      await page.mouse.move(node.x, node.y, { steps: 3 });
      await expect(page.locator(`[data-net-node="${node.id}"]`)).toHaveClass(/is-source/);
    });

    test("keeps a hovered node lit when an idle pulse was running", async ({ page }, info) => {
      test.skip(info.project.name === "reduced-motion", "no pulses under reduced motion");
      await page.goto("/");
      await expect(page.locator(".net__node.is-source")).toHaveCount(1, { timeout: 7000 });
      const node = await visibleNode(page);
      await page.mouse.move(node.x, node.y, { steps: 3 });
      await expect(page.locator(`[data-net-node="${node.id}"]`)).toHaveClass(/is-source/);
      await page.waitForTimeout(1800); // longer than PULSE_HOLD_MS (1400ms)
      await expect(page.locator(`[data-net-node="${node.id}"]`)).toHaveClass(/is-source/);
    });
  });

  test("pulses on its own when left alone, but never under reduced motion", async ({
    page,
  }, info) => {
    await page.goto("/");
    const lit = page.locator(".net__node.is-source");
    if (info.project.name === "reduced-motion") {
      await page.waitForTimeout(6000);
      await expect(lit).toHaveCount(0);
    } else {
      await expect(lit).toHaveCount(1, { timeout: 7000 });
    }
  });
});
