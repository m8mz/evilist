import { experimental_AstroContainer as AstroContainer } from "astro/container";

type Component = Parameters<AstroContainer["renderToString"]>[0];

let container: AstroContainer | undefined;

/**
 * Render an Astro component to HTML. Styles and scripts are not included: assert on markup.
 * Pass `request` for components that read `Astro.url` (e.g. the header's current-page link).
 */
export async function render(
  Component: Component,
  options: {
    props?: Record<string, unknown>;
    slots?: Record<string, string>;
    request?: Request;
  } = {},
): Promise<string> {
  container ??= await AstroContainer.create();
  return container.renderToString(Component, options);
}
