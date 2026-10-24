// Twenty Seventeen kleurt menu-items van de huidige pagina grijs (.current-menu-item > a).
export const markCurrent = (menu, url) =>
  menu.replaceAll(`"><a href="${url}">`, ` current-menu-item"><a href="${url}" aria-current="page">`);

export default function (eleventyConfig) {
  eleventyConfig.addFilter("markCurrent", markCurrent);
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("content/images");
  eleventyConfig.addGlobalData("layout", "page.njk");
  eleventyConfig.addGlobalData("bodyClass", "page-template-default page page-two-column");
  eleventyConfig.addFilter("longDate", (d) =>
    d.toLocaleDateString("nl-BE", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }));
  return {
    dir: { input: "content", includes: "../_includes", output: "_site" },
    markdownTemplateEngine: false, // WordPress-tekst nooit als template uitvoeren
  };
}
