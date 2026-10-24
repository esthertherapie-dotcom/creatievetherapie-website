// Twenty Seventeen kleurt menu-items van de huidige pagina grijs (.current-menu-item > a)
// en klapt op mobiel de submenu's van hun ouders open (.current-menu-ancestor).
export function markCurrent(menu, url) {
  const marked = menu.replaceAll(`"><a href="${url}">`, ` current-menu-item"><a href="${url}" aria-current="page">`);
  const open = []; // per open <li>: positie van het afsluitende " van zijn class
  const ancestors = new Set();
  for (const m of marked.matchAll(/<li class="([^"]*)"|<\/li>/g)) {
    if (m[0] === "</li>") { open.pop(); continue; }
    if (m[1].includes("current-menu-item")) open.forEach((i) => ancestors.add(i));
    open.push(m.index + m[0].length - 1);
  }
  let out = marked;
  for (const i of [...ancestors].sort((a, b) => b - a)) out = out.slice(0, i) + " current-menu-ancestor" + out.slice(i);
  return out;
}

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
