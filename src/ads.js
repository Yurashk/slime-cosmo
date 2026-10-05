// Реклама и игровые события через CrazyGames SDK v3.
//
// На CrazyGames SDK работает по-настоящему, на localhost показывает демо-ролики.
// На любом другом домене (например, GitHub Pages) SDK выключен и его вызовы бросают
// исключения — поэтому здесь всё обёрнуто: midgame тихо пропускается, rewarded недоступна,
// и игра ведёт себя так же, как у игрока с блокировщиком рекламы.

let sdk = null;
let ready = false;
let adblock = false;
let playing = false;
let showing = false;
let pauseHook = () => {};
let resumeHook = () => {};

function call(fn) {
  if (!ready) return;
  try { fn(sdk); } catch (e) {}
}

function request(type) {
  return new Promise(resolve => {
    if (!ready || showing) { resolve(false); return; }
    showing = true;
    let started = false;
    const finish = ok => {
      showing = false;
      if (started) resumeHook();
      resolve(ok);
    };
    try {
      sdk.ad.requestAd(type, {
        // По правилам CrazyGames: пауза и тишина ровно с начала ролика, не с момента запроса
        adStarted: () => { started = true; pauseHook(); },
        adFinished: () => finish(true),
        adError: () => finish(false)
      });
    } catch (e) {
      finish(false);
    }
  });
}

export const ads = {
  async init() {
    try {
      const S = window.CrazyGames && window.CrazyGames.SDK;
      if (!S) return;
      await S.init();
      if (S.environment !== 'crazygames' && S.environment !== 'local') return;
      sdk = S;
      ready = true;
      try { adblock = await S.ad.hasAdblock(); } catch (e) { adblock = false; }
    } catch (e) {
      sdk = null;
      ready = false;
    }
  },

  // Можно ли сейчас предлагать ролик за награду (SDK есть и нет блокировщика)
  get rewardedAvailable() {
    return ready && !adblock && !showing;
  },

  get showing() {
    return showing;
  },

  // Что делать игре на время ролика: пауза физики и звука, и обратно
  setHooks({ pause, resume }) {
    pauseHook = pause || (() => {});
    resumeHook = resume || (() => {});
  },

  // Межигровая реклама. Частоту дополнительно ограничивает сам SDK (обычно раз в 3 минуты).
  // Промис всегда разрешается — игра продолжает и без ролика.
  midgame() {
    return request('midgame');
  },

  // Ролик за награду: true — досмотрен, награду выдавать; false — ошибка/нет ролика
  rewarded() {
    return request('rewarded');
  },

  gameplayStart() {
    if (playing) return;
    playing = true;
    call(s => s.game.gameplayStart());
  },

  gameplayStop() {
    if (!playing) return;
    playing = false;
    call(s => s.game.gameplayStop());
  },

  happytime() {
    call(s => s.game.happytime());
  },

  loadingStart() {
    call(s => s.game.loadingStart());
  },

  loadingStop() {
    call(s => s.game.loadingStop());
  }
};
