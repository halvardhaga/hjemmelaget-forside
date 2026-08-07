Widgets["wikipedia-potd"] = {
  async render(container) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const url = `https://en.wikipedia.org/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Wikipedia feed request failed: ${res.status}`);
    const data = await res.json();
    const potd = data.image;
    if (!potd) throw new Error("No picture of the day in response");

    const wrapper = document.createElement("div");

    const title = document.createElement("div");
    title.textContent = "Picture of the day";
    title.style.fontSize = "0.75rem";
    title.style.opacity = "0.6";
    title.style.marginBottom = "0.5rem";
    title.style.textTransform = "uppercase";
    title.style.letterSpacing = "0.05em";
    wrapper.appendChild(title);

    const link = document.createElement("a");
    link.href = potd.filePage || potd.image?.source || "#";

    const img = document.createElement("img");
    img.src = potd.thumbnail?.source || potd.image?.source;
    img.alt = potd.description?.text || "Wikipedia Picture of the Day";
    img.style.width = "100%";
    img.style.borderRadius = "8px";
    img.style.display = "block";

    link.appendChild(img);
    wrapper.appendChild(link);

    if (potd.description?.text) {
      const caption = document.createElement("div");
      caption.textContent = potd.description.text;
      caption.style.fontSize = "0.8rem";
      caption.style.opacity = "0.8";
      caption.style.marginTop = "0.5rem";
      wrapper.appendChild(caption);
    }

    container.innerHTML = "";
    container.appendChild(wrapper);
  },
};
