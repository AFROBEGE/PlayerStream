/* ---------------------------
  INSTRUÇÕES:
  - Substitua 'YOUR_API_KEY_HERE' abaixo pela sua chave do YouTube Data API v3.
  - A busca faz chamadas ao endpoint 'search' da API. Você tem cota limitada (ver console para erros).
  - O player usa a YouTube IFrame API (já incluída no HTML).
--------------------------- */

const API_KEY = "AIzaSyDQyOYcyUY81D0VrpscJi8pH7LqkHdpb0I"; // <- coloque sua API Key aqui

// Elementos
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const resultsList = document.getElementById("results-list");
const playlistEl = document.getElementById("playlist");
const manualUrlInput = document.getElementById("manual-url");
const addUrlBtn = document.getElementById("add-url-btn");

const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

const trackTitle = document.getElementById("track-title");
const trackChannel = document.getElementById("track-channel");
const volumeSlider = document.getElementById("volume");
const muteBtn = document.getElementById("mute-btn");

const favoritesEl = document.getElementById("favorites");

let playlist = []; // {videoId,title,channel}
let currentIndex = -1;
let player; // YT player instance
let favorites = JSON.parse(localStorage.getItem("yt_favorites") || "[]");

// ------------------ YT IFrame API setup ------------------
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player-placeholder", {
    height: "220",
    width: "100%",
    videoId: "", // vazio inicialmente
    playerVars: {
      playsinline: 1,
      rel: 0,
      disablekb: 0
    },
    events: {
      onReady: () => {
        console.log("YouTube Player pronto");
        // aplicar volume inicial
        player.setVolume(Number(volumeSlider.value));
      },
      onStateChange: onPlayerStateChange
    }
  });
}
// A função above será chamada automaticamente pela IFrame API carregada no HTML.

// ------------------ Player events ------------------
function onPlayerStateChange(event) {
  // 0 = ended
  if (event.data === 0) {
    playNext();
  }
}

function playIndex(i) {
  if (!player) {
    alert("Player ainda não carregado.");
    return;
  }
  if (i < 0 || i >= playlist.length) return;
  currentIndex = i;
  const item = playlist[i];
  trackTitle.textContent = item.title;
  trackChannel.textContent = item.channel;
  player.loadVideoById(item.videoId);
}

function playNext() {
  if (playlist.length === 0) return;
  const next = (currentIndex + 1) % playlist.length;
  playIndex(next);
}
function playPrev() {
  if (playlist.length === 0) return;
  const prev = (currentIndex - 1 + playlist.length) % playlist.length;
  playIndex(prev);
}

// ------------------ Controls ------------------
playBtn.addEventListener("click", () => {
  if (!player) return;
  player.playVideo();
});
pauseBtn.addEventListener("click", () => {
  if (!player) return;
  player.pauseVideo();
});
stopBtn.addEventListener("click", () => {
  if (!player) return;
  player.stopVideo();
});
nextBtn.addEventListener("click", playNext);
prevBtn.addEventListener("click", playPrev);

volumeSlider.addEventListener("input", () => {
  if (!player) return;
  player.setVolume(Number(volumeSlider.value));
});
muteBtn.addEventListener("click", () => {
  if (!player) return;
  const muted = player.isMuted();
  if (muted) player.unMute();
  else player.mute();
  muteBtn.textContent = muted ? "🔇" : "🔊";
});

// ------------------ Playlist UI ------------------
function renderPlaylist() {
  playlistEl.innerHTML = "";
  if (playlist.length === 0) {
    playlistEl.textContent = "Playlist vazia";
    return;
  }
  playlist.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "playlist-item";
    div.innerHTML = `
      <div style="max-width:70%">
        <div style="font-weight:600">${it.title}</div>
        <div style="font-size:12px;color:#9aa0a6">${it.channel}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="small-btn" data-action="play" data-idx="${idx}">▶</button>
        <button class="small-btn" data-action="fav" data-idx="${idx}">⭐</button>
        <button class="small-btn" data-action="remove" data-idx="${idx}">✖</button>
      </div>
    `;
    playlistEl.appendChild(div);
  });

  // delegação de eventos
  playlistEl.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      const action = btn.dataset.action;
      const idx = Number(btn.dataset.idx);
      if (action === "play") playIndex(idx);
      if (action === "remove") {
        playlist.splice(idx, 1);
        if (currentIndex === idx) {
          player.stopVideo();
          currentIndex = -1;
          trackTitle.textContent = "Nenhuma faixa";
          trackChannel.textContent = "—";
        } else if (currentIndex > idx) {
          currentIndex--;
        }
        renderPlaylist();
      }
      if (action === "fav") {
        addFavorite(playlist[idx]);
      }
    };
  });
}

// ------------------ Favorites ------------------
function renderFavorites() {
  favoritesEl.innerHTML = "";
  if (favorites.length === 0) {
    favoritesEl.textContent = "Nenhum favorito";
    return;
  }
  favorites.forEach((f, i) => {
    const d = document.createElement("div");
    d.className = "fav-item";
    d.innerHTML = `
      <div style="max-width:70%"><div style="font-weight:600">${f.title}</div><div style="font-size:12px;color:#9aa0a6">${f.channel}</div></div>
      <div style="display:flex;gap:6px">
        <button class="small-btn" data-idx="${i}" data-action="play">▶</button>
        <button class="small-btn" data-idx="${i}" data-action="remove">✖</button>
      </div>
    `;
    favoritesEl.appendChild(d);
  });
  favoritesEl.querySelectorAll("button").forEach(b => {
    b.onclick = () => {
      const idx = Number(b.dataset.idx);
      const act = b.dataset.action;
      if (act === "play") {
        // adicionar à playlist e tocar imediatamente
        playlist.push(favorites[idx]);
        renderPlaylist();
        playIndex(playlist.length - 1);
      } else if (act === "remove") {
        favorites.splice(idx, 1);
        localStorage.setItem("yt_favorites", JSON.stringify(favorites));
        renderFavorites();
      }
    };
  });
}

function addFavorite(item) {
  if (!item) return;
  // evitar duplicata
  if (!favorites.find(f => f.videoId === item.videoId)) {
    favorites.push(item);
    localStorage.setItem("yt_favorites", JSON.stringify(favorites));
    renderFavorites();
  } else {
    alert("Já está nos favoritos");
  }
}

// ------------------ Search (YouTube Data API) ------------------
async function searchYouTube(q) {
  if (!API_KEY || API_KEY !== "AIzaSyDQyOYcyUY81D0VrpscJi8pH7LqkHdpb0I") {
    resultsList.innerHTML = "<div style='color:#f4b844;padding:10px'>Insira sua API Key no arquivo <code>script.js</code> para usar a busca.</div>";
    return;
  }
  resultsList.innerHTML = "<div style='padding:10px;color:#9aa0a6'>Buscando…</div>";
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", q);
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "12");
    url.searchParams.set("key", API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Erro na API: " + res.status);
    const data = await res.json();
    if (!data.items) throw new Error("Resposta inesperada da API");

    renderSearchResults(data.items);
  } catch (err) {
    console.error(err);
    resultsList.innerHTML = `<div style="padding:10px;color:#ff7b00">Erro na busca: ${err.message}</div>`;
  }
}

function renderSearchResults(items) {
  resultsList.innerHTML = "";
  if (!items || items.length === 0) {
    resultsList.textContent = "Nenhum resultado";
    return;
  }
  items.forEach(it => {
    const vid = it.id.videoId;
    const title = it.snippet.title;
    const channel = it.snippet.channelTitle;
    const thumb = it.snippet.thumbnails?.default?.url || "";

    const div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center">
        <img src="${thumb}" alt="" style="width:56px;height:40px;border-radius:6px;object-fit:cover" />
        <div class="result-meta">
          <div class="result-title">${title}</div>
          <div class="result-sub">${channel}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="small-btn" data-vid="${vid}" data-title="${encodeURIComponent(title)}" data-channel="${encodeURIComponent(channel)}">Adicionar à playlist</button>
        <button class="small-btn tocar" data-play="${vid}">Tocar</button>
      </div>
    `;
    resultsList.appendChild(div);

    // botoes
    const addBtn = div.querySelector("button[data-vid]");
    addBtn.onclick = () => {
      playlist.push({
        videoId: vid,
        title: decodeURIComponent(addBtn.dataset.title),
        channel: decodeURIComponent(addBtn.dataset.channel)
      });
      renderPlaylist();
    };
    const playBtnLocal = div.querySelector("button[data-play]");
    playBtnLocal.onclick = () => {
      playlist.push({
        videoId: vid,
        title,
        channel
      });
      renderPlaylist();
      playIndex(playlist.length - 1);
    };
  });
}

// ------------------ Manual URL (adicionar link do YouTube) ------------------
addUrlBtn.addEventListener("click", () => {
  const url = manualUrlInput.value.trim();
  if (!url) return alert("Cole um link do YouTube.");
  // extrair videoId
  const id = extractYouTubeID(url);
  if (!id) return alert("Não foi possível extrair ID do YouTube.");
  // buscar metadados via o endpoint videos (opcional) - mas para agilizar adicionamos com id vazio de título
  playlist.push({ videoId: id, title: `YouTube: ${id}`, channel: "Link manual" });
  renderPlaylist();
  manualUrlInput.value = "";
});

function extractYouTubeID(url) {
  // Suporta vários formatos: youtu.be/ID, youtube.com/watch?v=ID, etc.
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    // embed path
    const parts = u.pathname.split("/");
    return parts.pop() || null;
  } catch {
    return null;
  }
}

// ------------------ Inicialização ------------------
searchBtn.addEventListener("click", () => {
  const q = searchInput.value.trim();
  if (!q) return;
  searchYouTube(q);
});
searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") searchBtn.click(); });

renderPlaylist();
renderFavorites();

// Caso o usuário queira carregar favoritos salvos
renderFavorites();

/* Nota: a função onYouTubeIframeAPIReady() deve estar disponível no escopo global
   — a IFrame API chamará ela automaticamente quando pronta. */
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
