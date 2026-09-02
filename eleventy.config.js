export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  // Browsers ask for /favicon.ico by convention, not by <link>.
  eleventyConfig.addPassthroughCopy({ "src/assets/img/favicon.ico": "favicon.ico" });
  eleventyConfig.addWatchTarget("src/assets/");

  // Pieces marked `featured: true` lead the homepage; the rest fall in behind them.
  eleventyConfig.addCollection("pieces", (collectionApi) =>
    collectionApi
      .getFilteredByTag("piece")
      .sort((a, b) => (b.data.completed || "").localeCompare(a.data.completed || ""))
  );

  eleventyConfig.addCollection("featured", (collectionApi) =>
    collectionApi
      .getFilteredByTag("piece")
      .filter((item) => item.data.featured)
      .sort((a, b) => (b.data.completed || "").localeCompare(a.data.completed || ""))
      .slice(0, 3)
  );

  // "2026-08" -> "August 2026". Dates are written as plain strings in front matter
  // so a piece can be dated to a month without inventing a day.
  eleventyConfig.addFilter("monthYear", (value) => {
    if (!value) return "";
    const [year, month] = String(value).split("-");
    const names = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const name = names[Number(month) - 1];
    return name ? `${name} ${year}` : String(value);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
