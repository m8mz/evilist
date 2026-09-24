import { experimental_AstroContainer as AstroContainer } from "astro/container";

type Component = Parameters<AstroContainer["renderToString"]>[0];

let container: AstroContainer | undefined;

/** Render an Astro component to HTML. Styles and scripts are not included: assert on markup. */
export async function render(
  Component: Component,
  options: { props?: Record<string, unknown>; slots?: Record<string, string> } = {},
): Promise<string> {
  container ??= await AstroContainer.create();
  return container.renderToString(Component, options);
}
