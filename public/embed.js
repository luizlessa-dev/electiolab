/**
 * ElectioLab Embed Widget
 *
 * Uso:
 *   <div data-electiolab-eleicao="UUID" data-theme="light" data-size="md" data-height="420"></div>
 *   <script src="https://electiolab.com/embed.js" async></script>
 *
 * Atributos suportados:
 *   data-electiolab-eleicao  ID da eleição (obrigatório)
 *   data-theme               "light" | "dark" (default: "light")
 *   data-size                "sm" | "md" | "lg" (default: "md")
 *   data-height              altura em px (default: 420)
 */
(function () {
  "use strict";
  if (window.__electiolabEmbedLoaded) return;
  window.__electiolabEmbedLoaded = true;

  var ORIGIN = "https://electiolab.com";

  function init() {
    var nodes = document.querySelectorAll("[data-electiolab-eleicao]");
    nodes.forEach(function (node) {
      // já hidratado?
      if (node.querySelector("iframe[data-electiolab]")) return;

      var id = node.getAttribute("data-electiolab-eleicao");
      if (!id) return;

      var theme = node.getAttribute("data-theme") || "light";
      var size = node.getAttribute("data-size") || "md";
      var height = node.getAttribute("data-height") || (size === "sm" ? "320" : size === "lg" ? "560" : "420");

      var src =
        ORIGIN +
        "/embed/eleicao/" +
        encodeURIComponent(id) +
        "?theme=" +
        encodeURIComponent(theme) +
        "&size=" +
        encodeURIComponent(size);

      var iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.setAttribute("data-electiolab", "1");
      iframe.style.cssText =
        "width:100%;border:1px solid " +
        (theme === "dark" ? "#1f2937" : "#e5e7eb") +
        ";border-radius:8px;display:block;background:" +
        (theme === "dark" ? "#0b1220" : "#ffffff") +
        ";";
      iframe.height = height;
      iframe.loading = "lazy";
      iframe.title = "ElectioLab — pesquisas eleitorais";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";

      // limpa loading text se houver
      node.innerHTML = "";
      node.appendChild(iframe);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Auto re-scan caso o site adicione widgets dinamicamente (SPA)
  if (window.MutationObserver) {
    var observer = new MutationObserver(function () {
      init();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
