export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("content/images");
  eleventyConfig.addGlobalData("layout", "page.njk");
  eleventyConfig.addGlobalData("bodyClass", "page-template-default page page-two-column");
  eleventyConfig.addFilter("longDate", (d) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }));
  return {
    dir: { input: "content", includes: "../_includes", output: "_site" },
    markdownTemplateEngine: false, // WordPress-tekst nooit als template uitvoeren
  };
}
