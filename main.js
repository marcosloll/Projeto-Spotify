console.log(window.location.search);

const clientId = "37a6c9b5b2714236921fea4bd8a67b37";
const clientSecret = "b9989566f2c24ab0bd5f655c5a20ad04";
const redirectUri = "http://127.0.0.1:5500/index.html";

const generateCodeVerifier = () => {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

const generateCodeChallenge = async (verifier) => {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

const loginWithSpotify = async () => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem("code_verifier", verifier);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append(
    "scope",
    "streaming user-read-email user-read-private",
  );
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("code_challenge", challenge);
  window.location.href = authUrl.toString();
};

const getTokenFromCode = async (code) => {
  const verifier = localStorage.getItem("code_verifier");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=authorization_code&client_id=${clientId}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}&code_verifier=${verifier}`,
  });
  const data = await response.json();
  console.log("resposta do spotify:", data);
  return data.access_token;
};

const loginBtn = document.getElementById("login-btn");
loginBtn.addEventListener("click", () => {
  loginWithSpotify();
});

const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get("code");
if (code) {
  getTokenFromCode(code).then((token) => {
    console.log("token recebido:", token);
    localStorage.setItem("spotify_token", token);
    window.history.replaceState({}, document.title, window.location.pathname);
    loginBtn.style.display = "none";
  });
}

const input = document.querySelector("input");
const button = document.querySelector(".search button");
const output = document.querySelector(".results");

const getToken = async () => {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });
  const data = await response.json();
  return data.access_token;
};

const searchMusic = async (query, token) => {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${query}&type=track&limit=10&market=BR`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();
  return data.tracks.items;
};

const renderResults = (tracks) => {
  const albumCover = document.getElementById("album-cover");
  const trackName = document.querySelector(".player__track-name");
  const artist = document.querySelector(".player__artist");

  document.getElementById("album-placeholder").style.display = "none";
  document.getElementById("album-cover").style.display = "block";

  // Mostra a primeira música por padrão
  albumCover.src = tracks[0].album.images[0].url;
  trackName.innerHTML = `<a href="${tracks[0].external_urls.spotify}" target="_blank" style="color: white; text-decoration: none;">${tracks[0].name}</a>`;
  artist.innerHTML = tracks[0].artists[0].name;
};

button.addEventListener("click", async () => {
  const token = localStorage.getItem("spotify_token") || (await getToken());
  const tracks = await searchMusic(input.value, token);
  renderResults(tracks);
});

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    button.click();
  }
});
