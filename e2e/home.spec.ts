import { test, expect, type Page } from "@playwright/test";

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

  test("frames the portrait as a terminal window with the S+ chip", async ({ page }) => {
    await page.goto("/");
    const frame = page.locator(".hero .term");
    await expect(frame.locator(".term__title")).toHaveText("marcus@evilist:~");
    await expect(frame.getByRole("img", { name: "S+ rank: Sr. Systems Architect" })).toHaveCount(1);
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

/**
 * Scrolls the band's top edge to `y` px below the viewport's top (negative is above it), waits
 * two frames for Motion, then measures how far the image has moved from centre (px, + is down)
 * and whether it still covers the band. The image box's inset and the band's clip both resolve
 * against the padding box (border-box minus the 1px top rule), so the reference frame here is the
 * padding box, not `getBoundingClientRect()`'s border box.
 */
async function rackAt(page: Page, y: number) {
  const band = page.locator(".parallax");
  await band.evaluate((el, y) => {
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - y, behavior: "instant" });
  }, y);
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  return band.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const m = el.querySelector(".parallax__media")!.getBoundingClientRect();
    // The image box's inset and the band's clip both use the padding box: the 1px top rule is
    // the band's border, above it.
    const top = b.top + el.clientTop;
    const height = el.clientHeight;
    return {
      height: b.height,
      shift: m.top - (top - 0.12 * height),
      covers: m.top <= top + 0.5 && m.bottom >= top + height - 0.5,
    };
  });
}

test.describe("rack band", () => {
  test("sits full width between Work and About, with the rack as a lazy illustration", async ({
    page,
  }) => {
    await page.goto("/");
    const band = page.locator("#work + .parallax");
    await expect(band).toHaveCount(1);
    const box = (await band.boundingBox())!;
    const work = (await page.locator("#work").boundingBox())!;
    const about = (await page.locator("#about").boundingBox())!;
    // Flush against both neighbours. (Astro renders the band's <script> in place, so About is
    // not the band's adjacent sibling in the DOM; the boxes are what count.)
    expect(Math.round(box.y)).toBe(Math.round(work.y + work.height));
    expect(Math.round(about.y)).toBe(Math.round(box.y + box.height));
    expect(box.x).toBe(0);
    expect(box.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 1);
    const img = band.locator("img");
    await expect(img).toHaveAttribute("loading", "lazy");
    await expect(img).toHaveAttribute("alt", /^Illustration: a colocation rack row at night/);
    await expect(page.locator(".work__infra, .topo")).toHaveCount(0);
  });

  test("has one iron rule above and one below, never two", async ({ page }) => {
    await page.goto("/");
    const band = page.locator(".parallax");
    await expect(band).toHaveCSS("border-top-width", "1px");
    await expect(band).toHaveCSS("border-top-color", "rgb(32, 32, 32)");
    // The rule below is About's own top rule, flush with the band (checked in the test above).
    await expect(band).toHaveCSS("border-bottom-width", "0px");
    await expect(page.locator("#about")).toHaveCSS("border-top-width", "1px");
  });

  test("drifts with the scroll and never shows an edge; holds still under reduced motion", async ({
    page,
  }, info) => {
    await page.goto("/");
    const vh = page.viewportSize()!.height;
    const entering = await rackAt(page, vh * 0.9);
    const leaving = await rackAt(page, vh * 0.1 - entering.height);
    if (info.project.name === "reduced-motion") {
      expect(Math.abs(entering.shift)).toBeLessThan(1);
      expect(Math.abs(leaving.shift)).toBeLessThan(1);
    } else {
      expect(entering.shift).toBeLessThan(0);
      expect(leaving.shift).toBeGreaterThan(0);
      expect(leaving.shift - entering.shift).toBeGreaterThan(0.15 * entering.height);
    }
    // Progress 0 (top edge at the viewport's bottom), ½ (centred) and 1 (bottom edge at its top).
    for (const y of [vh, (vh - entering.height) / 2, -entering.height]) {
      expect((await rackAt(page, y)).covers, `band top at ${Math.round(y)}px`).toBe(true);
    }
  });

  test("is sharp on every screen: the served image is at least as wide as it is drawn", async ({
    page,
  }) => {
    await page.goto("/");
    await rackAt(page, 0);
    const img = page.locator(".parallax img");
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBe(true);
    const { served, needed } = await img.evaluate(async (el: HTMLImageElement) => {
      // naturalWidth of a srcset image is density-corrected; a bare probe reports the file's pixels.
      const probe = new Image();
      probe.src = el.currentSrc;
      await probe.decode();
      const box = el.getBoundingClientRect();
      // object-fit: cover draws the image at whichever side needs the larger scale.
      const drawn = Math.max(box.width, box.height * (probe.naturalWidth / probe.naturalHeight));
      return { served: probe.naturalWidth, needed: drawn * devicePixelRatio };
    });
    // 2000 px is the largest rendition; browsers may settle for a candidate up to ~15% short.
    expect(served).toBeGreaterThanOrEqual(0.85 * Math.min(needed, 2000));
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
  interface Dot {
    id: string;
    x: number;
    y: number;
  }

  /**
   * Labelled nodes the network may light, by scripts/stack-network.ts's rule: the dot is inside
   * the visible pane (inset 4px) and clear of the portrait (+8px). `slack` px on top of both
   * leaves out a node that the portrait's tilt could cover while the cursor moves.
   */
  const eligibleNodes = (page: Page, slack = 0): Promise<Dot[]> =>
    page.evaluate((slack) => {
      const pane = document.querySelector("[data-network]")!.getBoundingClientRect();
      const photo = document.querySelector(".hero__portrait")!.getBoundingClientRect();
      const inset = 4 + slack;
      const margin = 8 + slack;
      const dots = [];
      for (const g of document.querySelectorAll<SVGGElement>(".net__node--labelled")) {
        const r = g.querySelector("circle")!.getBoundingClientRect();
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        const inPane =
          x >= Math.max(pane.left, 0) + inset &&
          x <= Math.min(pane.right, innerWidth) - inset &&
          y >= Math.max(pane.top, 0) + inset &&
          y <= Math.min(pane.bottom, innerHeight) - inset;
        const underPhoto =
          x >= photo.left - margin &&
          x <= photo.right + margin &&
          y >= photo.top - margin &&
          y <= photo.bottom + margin;
        if (inPane && !underPhoto) dots.push({ id: g.dataset.netNode!, x, y });
      }
      return dots;
    }, slack);

  /** The first node the cursor can light, clear of the tilt's reach. */
  const visibleNode = async (page: Page): Promise<Dot> => {
    const [node] = await eligibleNodes(page, 4);
    if (!node) throw new Error("no labelled node on screen");
    return node;
  };

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
      // Viewport units (the pane's 100vw edge) can lag a resize until the next frame is drawn.
      await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
      );
      const node = await visibleNode(page);
      await page.mouse.move(node.x, node.y, { steps: 3 });
      await expect(page.locator(`[data-net-node="${node.id}"]`)).toHaveClass(/is-source/);
    });

    test("keeps a hovered node lit when an idle pulse was running", async ({ page }, info) => {
      test.skip(info.project.name === "reduced-motion", "no pulses under reduced motion");
      await page.goto("/");
      const pulsing = page.locator(".net__node.is-source");
      // Up to two pulses can be live at once; any one of them will do.
      await expect(pulsing).not.toHaveCount(0, { timeout: 7000 });
      // The pulse only lights nodes the visitor can see, so its dot is there to hover.
      const node = await pulsing.first().evaluate((g: SVGGElement) => {
        const r = g.querySelector("circle")!.getBoundingClientRect();
        return { id: g.dataset.netNode!, x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      await page.mouse.move(node.x, node.y, { steps: 3 });
      const source = page.locator(`[data-net-node="${node.id}"]`);
      await expect(source).toHaveClass(/is-source/);
      await page.waitForTimeout(1800); // longer than PULSE_HOLD_MS (1400ms)
      await expect(source).toHaveClass(/is-source/);
    });

    test("never lights a node hidden under the portrait", async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "one width");
      await page.goto("/");
      const photo = (await page.locator(".hero__portrait").boundingBox())!;
      await page.mouse.move(photo.x + photo.width / 2, photo.y + photo.height / 2, { steps: 3 });
      await page.waitForTimeout(400);
      const covered = await page.evaluate(() => {
        const photo = document.querySelector(".hero__portrait")!.getBoundingClientRect();
        return [...document.querySelectorAll<SVGGElement>(".net__node.is-source")]
          .filter((g) => {
            const r = g.querySelector("circle")!.getBoundingClientRect();
            const x = r.x + r.width / 2;
            const y = r.y + r.height / 2;
            return x >= photo.left && x <= photo.right && y >= photo.top && y <= photo.bottom;
          })
          .map((g) => g.dataset.netNode);
      });
      expect(covered).toEqual([]);
    });

    for (const width of [1152, 1440]) {
      test(`keeps each label on screen and off the portrait (${width}px)`, async ({
        page,
      }, info) => {
        test.skip(info.project.name !== "desktop", "two widths, on desktop");
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        const nodes = await eligibleNodes(page, 4);
        expect(nodes.length).toBeGreaterThanOrEqual(3);
        let shown = 0;
        for (const node of nodes) {
          await page.mouse.move(node.x, node.y, { steps: 3 });
          const source = page.locator(`[data-net-node="${node.id}"]`);
          await expect(source).toHaveClass(/is-source/);
          // A label with no room on either side stays hidden.
          if ((await source.getAttribute("class"))!.includes("is-unlabelled")) continue;
          const label = source.locator(".net__label");
          await expect(label).toHaveCSS("opacity", "1");
          const box = (await label.boundingBox())!;
          const photo = (await page.locator(".hero__portrait").boundingBox())!;
          const name = (await label.textContent())!;
          const clear =
            box.x >= photo.x + photo.width ||
            box.x + box.width <= photo.x ||
            box.y >= photo.y + photo.height ||
            box.y + box.height <= photo.y;
          expect(clear, `${name} clears the portrait`).toBe(true);
          expect(box.x, name).toBeGreaterThanOrEqual(0);
          expect(box.y, name).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width, name).toBeLessThanOrEqual(width);
          expect(box.y + box.height, name).toBeLessThanOrEqual(900);
          shown++;
        }
        expect(shown).toBeGreaterThanOrEqual(3);
      });
    }
  });

  test("pulses on its own when left alone, but never under reduced motion", async ({
    page,
  }, info) => {
    await page.goto("/");
    // Pulses only light nodes on screen; on phones the pane starts below the fold.
    await page.locator("[data-network]").evaluate((el) => {
      const bottom = el.getBoundingClientRect().bottom;
      if (bottom > innerHeight) scrollBy({ top: bottom - innerHeight, behavior: "instant" });
    });
    const lit = page.locator(".net__node.is-source");
    if (info.project.name === "reduced-motion") {
      await page.waitForTimeout(6000);
      await expect(lit).toHaveCount(0);
    } else {
      // One pulse every 1.25 s, up to two live at once: never none for long, never more than two.
      await expect(lit).not.toHaveCount(0, { timeout: 7000 });
      expect(await lit.count()).toBeLessThanOrEqual(2);
      await page.waitForTimeout(3000);
      expect(await lit.count()).toBeLessThanOrEqual(2);
    }
  });
});
