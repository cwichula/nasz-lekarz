// Strona główna: w wariancie A (VARIANT=a, podgląd /va/) zamiast układu „Puls” jest jednostronicowy
// dokument w wyglądzie strony z 2019 r. (src/_includes/variants/home-a.njk). Bez wariantu – bez zmian.
export default {
  eleventyComputed: {
    layout: (data) => (data.variant === "a" ? "variants/home-a.njk" : data.layout),
  },
};
