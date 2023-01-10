import mermaid from "mermaid";

/* setup mermaid */
mermaid.initialize({ startOnLoad: true, securityLevel: "loose" });

window.onload = () => {
  /* setup event listeners */
  const nodes = document.getElementsByClassName("node");

  for (const vertexElement of nodes) {
    const classList = [...vertexElement.classList.values()];

    for (const className of classList) {
      if (/^(deploy|call|transfer|event)/.test(className)) {
        const actionElement = document.getElementById(`action-${className}`);
        const vertexClassString = [...classList, "hovering"].join(" ");

        function addHover() {
          vertexElement.setAttribute("class", vertexClassString);
          actionElement!.setAttribute("class", "hovering");
        }

        function removeHover() {
          vertexElement.setAttribute("class", classList.join(" "));
          actionElement!.removeAttribute("class");
        }

        vertexElement.addEventListener("mouseover", addHover);
        actionElement!.addEventListener("mouseover", addHover);

        vertexElement.addEventListener("mouseleave", removeHover);
        actionElement!.addEventListener("mouseleave", removeHover);
      }
    }
  }
};
