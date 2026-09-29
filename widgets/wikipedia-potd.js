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

    const title = document.createElement("div");
    title.className = "widget-title";
    title.textContent = "Picture of the day";

    const link = document.createElement("a");
    link.href = potd.filePage || potd.image?.source || "#";

    const img = document.createElement("img");
    img.className = "widget-image";
    img.src = potd.thumbnail?.source || potd.image?.source;
    img.alt = potd.description?.text || "Wikipedia Picture of the Day";
    link.append(img);

    const wrapper = document.createElement("div");
    wrapper.append(title, link);

    if (potd.description?.text) {
      const caption = document.createElement("div");
      caption.className = "widget-caption";
      caption.textContent = potd.description.text;
      wrapper.append(caption);
    }

    container.replaceChildren(wrapper);
  },
};
