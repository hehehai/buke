import { ApplicationMenu } from "electrobun/bun";

export type MenuHandlers = {
  openUrl: (url: string) => void;
  reload: () => void;
  toggleDevTools: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  windowCompact: () => void;
  windowStandard: () => void;
  windowWide: () => void;
  clearData: () => void;
  closeWindow: () => void;
  quit: () => void;
};

export type MenuLocaleConfig = {
  [key: string]: string;
};

export type AboutMenuItem = {
  type: "link";
  label: string;
  url: string;
};

export type AboutMenuSeparator = {
  type: "separator";
};

export type AboutMenuConfig = Array<AboutMenuItem | AboutMenuSeparator>;

const OPEN_URL_PREFIX = "open-url:";

type BuiltinMenuLocale = {
  view: string;
  window: string;
  about: string;
  reload: string;
  toggleDevTools: string;
  clearSiteData: string;
  closeWindow: string;
  quit: string;
  zoomIn: string;
  zoomOut: string;
  zoomReset: string;
  compact: string;
  standard: string;
  wide: string;
};

const DEFAULT_MENU_I18N: BuiltinMenuLocale = {
  view: "View",
  window: "Window",
  about: "About",
  reload: "Reload",
  toggleDevTools: "Toggle DevTools",
  clearSiteData: "Clear Site Data",
  closeWindow: "Close Window",
  quit: "Quit",
  zoomIn: "Zoom In",
  zoomOut: "Zoom Out",
  zoomReset: "Reset Zoom",
  compact: "Compact",
  standard: "Standard",
  wide: "Wide",
};

const PRESET_MENU_I18N: Record<string, BuiltinMenuLocale> = {
  en: DEFAULT_MENU_I18N,
  "en-us": DEFAULT_MENU_I18N,
  "en-gb": DEFAULT_MENU_I18N,
  "zh-cn": {
    view: "视图",
    window: "窗口",
    about: "关于",
    reload: "重新加载",
    toggleDevTools: "切换开发者工具",
    clearSiteData: "清除站点数据",
    closeWindow: "关闭窗口",
    quit: "退出",
    zoomIn: "放大",
    zoomOut: "缩小",
    zoomReset: "实际大小",
    compact: "紧凑",
    standard: "标准",
    wide: "宽屏",
  },
  "zh-hans": {
    view: "视图",
    window: "窗口",
    about: "关于",
    reload: "重新加载",
    toggleDevTools: "切换开发者工具",
    clearSiteData: "清除站点数据",
    closeWindow: "关闭窗口",
    quit: "退出",
    zoomIn: "放大",
    zoomOut: "缩小",
    zoomReset: "实际大小",
    compact: "紧凑",
    standard: "标准",
    wide: "宽屏",
  },
  "zh-hk": {
    view: "檢視",
    window: "視窗",
    about: "關於",
    reload: "重新載入",
    toggleDevTools: "切換開發者工具",
    clearSiteData: "清除網站資料",
    closeWindow: "關閉視窗",
    quit: "退出",
    zoomIn: "放大",
    zoomOut: "縮小",
    zoomReset: "重設大小",
    compact: "緊湊",
    standard: "標準",
    wide: "寬螢幕",
  },
  "zh-tw": {
    view: "檢視",
    window: "視窗",
    about: "關於",
    reload: "重新載入",
    toggleDevTools: "切換開發者工具",
    clearSiteData: "清除網站資料",
    closeWindow: "關閉視窗",
    quit: "退出",
    zoomIn: "放大",
    zoomOut: "縮小",
    zoomReset: "重設大小",
    compact: "緊湊",
    standard: "標準",
    wide: "寬螢幕",
  },
  "zh-hant": {
    view: "檢視",
    window: "視窗",
    about: "關於",
    reload: "重新載入",
    toggleDevTools: "切換開發者工具",
    clearSiteData: "清除網站資料",
    closeWindow: "關閉視窗",
    quit: "退出",
    zoomIn: "放大",
    zoomOut: "縮小",
    zoomReset: "重設大小",
    compact: "緊湊",
    standard: "標準",
    wide: "寬螢幕",
  },
  "zh-sg": {
    view: "视图",
    window: "窗口",
    about: "关于",
    reload: "重新加载",
    toggleDevTools: "切换开发者工具",
    clearSiteData: "清除站点数据",
    closeWindow: "关闭窗口",
    quit: "退出",
    zoomIn: "放大",
    zoomOut: "缩小",
    zoomReset: "实际大小",
    compact: "紧凑",
    standard: "标准",
    wide: "宽屏",
  },
  "ja-jp": {
    view: "表示",
    window: "ウィンドウ",
    about: "情報",
    reload: "再読み込み",
    toggleDevTools: "開発者ツール切替",
    clearSiteData: "サイトデータを消去",
    closeWindow: "ウィンドウを閉じる",
    quit: "終了",
    zoomIn: "拡大",
    zoomOut: "縮小",
    zoomReset: "拡大率をリセット",
    compact: "コンパクト",
    standard: "標準",
    wide: "ワイド",
  },
  ja: {
    view: "表示",
    window: "ウィンドウ",
    about: "情報",
    reload: "再読み込み",
    toggleDevTools: "開発者ツール切替",
    clearSiteData: "サイトデータを消去",
    closeWindow: "ウィンドウを閉じる",
    quit: "終了",
    zoomIn: "拡大",
    zoomOut: "縮小",
    zoomReset: "拡大率をリセット",
    compact: "コンパクト",
    standard: "標準",
    wide: "ワイド",
  },
  "ko-kr": {
    view: "보기",
    window: "창",
    about: "정보",
    reload: "새로고침",
    toggleDevTools: "개발자 도구 전환",
    clearSiteData: "사이트 데이터 지우기",
    closeWindow: "창 닫기",
    quit: "종료",
    zoomIn: "확대",
    zoomOut: "축소",
    zoomReset: "확대/축소 재설정",
    compact: "압축",
    standard: "표준",
    wide: "넓게",
  },
  ko: {
    view: "보기",
    window: "창",
    about: "정보",
    reload: "새로고침",
    toggleDevTools: "개발자 도구 전환",
    clearSiteData: "사이트 데이터 지우기",
    closeWindow: "창 닫기",
    quit: "종료",
    zoomIn: "확대",
    zoomOut: "축소",
    zoomReset: "확대/축소 재설정",
    compact: "압축",
    standard: "표준",
    wide: "넓게",
  },
  "fr-fr": {
    view: "Affichage",
    window: "Fenêtre",
    about: "À propos",
    reload: "Actualiser",
    toggleDevTools: "Basculer les outils développeur",
    clearSiteData: "Effacer les données du site",
    closeWindow: "Fermer la fenêtre",
    quit: "Quitter",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    zoomReset: "Réinitialiser le zoom",
    compact: "Compact",
    standard: "Standard",
    wide: "Large",
  },
  fr: {
    view: "Affichage",
    window: "Fenêtre",
    about: "À propos",
    reload: "Actualiser",
    toggleDevTools: "Basculer les outils développeur",
    clearSiteData: "Effacer les données du site",
    closeWindow: "Fermer la fenêtre",
    quit: "Quitter",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    zoomReset: "Réinitialiser le zoom",
    compact: "Compact",
    standard: "Standard",
    wide: "Large",
  },
  "de-de": {
    view: "Ansicht",
    window: "Fenster",
    about: "Über",
    reload: "Neu laden",
    toggleDevTools: "Entwicklertools umschalten",
    clearSiteData: "Websitedaten löschen",
    closeWindow: "Fenster schließen",
    quit: "Beenden",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
    zoomReset: "Zoom zurücksetzen",
    compact: "Kompakt",
    standard: "Standard",
    wide: "Breit",
  },
  de: {
    view: "Ansicht",
    window: "Fenster",
    about: "Über",
    reload: "Neu laden",
    toggleDevTools: "Entwicklertools umschalten",
    clearSiteData: "Websitedaten löschen",
    closeWindow: "Fenster schließen",
    quit: "Beenden",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
    zoomReset: "Zoom zurücksetzen",
    compact: "Kompakt",
    standard: "Standard",
    wide: "Breit",
  },
  "es-es": {
    view: "Vista",
    window: "Ventana",
    about: "Acerca de",
    reload: "Recargar",
    toggleDevTools: "Alternar herramientas de desarrollador",
    clearSiteData: "Borrar datos del sitio",
    closeWindow: "Cerrar ventana",
    quit: "Salir",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    zoomReset: "Restablecer zoom",
    compact: "Compacto",
    standard: "Estándar",
    wide: "Ancho",
  },
  es: {
    view: "Vista",
    window: "Ventana",
    about: "Acerca de",
    reload: "Recargar",
    toggleDevTools: "Alternar herramientas de desarrollador",
    clearSiteData: "Borrar datos del sitio",
    closeWindow: "Cerrar ventana",
    quit: "Salir",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    zoomReset: "Restablecer zoom",
    compact: "Compacto",
    standard: "Estándar",
    wide: "Ancho",
  },
  "it-it": {
    view: "Visualizza",
    window: "Finestra",
    about: "Informazioni",
    reload: "Ricarica",
    toggleDevTools: "Strumenti sviluppatore",
    clearSiteData: "Cancella dati sito",
    closeWindow: "Chiudi finestra",
    quit: "Esci",
    zoomIn: "Ingrandisci",
    zoomOut: "Riduci",
    zoomReset: "Ripristina zoom",
    compact: "Compatto",
    standard: "Standard",
    wide: "Ampio",
  },
  it: {
    view: "Visualizza",
    window: "Finestra",
    about: "Informazioni",
    reload: "Ricarica",
    toggleDevTools: "Strumenti sviluppatore",
    clearSiteData: "Cancella dati sito",
    closeWindow: "Chiudi finestra",
    quit: "Esci",
    zoomIn: "Ingrandisci",
    zoomOut: "Riduci",
    zoomReset: "Ripristina zoom",
    compact: "Compatto",
    standard: "Standard",
    wide: "Ampio",
  },
  "pt-br": {
    view: "Visualizar",
    window: "Janela",
    about: "Sobre",
    reload: "Recarregar",
    toggleDevTools: "Alternar ferramentas do desenvolvedor",
    clearSiteData: "Limpar dados do site",
    closeWindow: "Fechar janela",
    quit: "Sair",
    zoomIn: "Ampliar",
    zoomOut: "Reduzir",
    zoomReset: "Redefinir zoom",
    compact: "Compacto",
    standard: "Padrão",
    wide: "Amplo",
  },
  "pt-pt": {
    view: "Visualizar",
    window: "Janela",
    about: "Sobre",
    reload: "Recarregar",
    toggleDevTools: "Alternar ferramentas de desenvolvimento",
    clearSiteData: "Limpar dados do site",
    closeWindow: "Fechar janela",
    quit: "Sair",
    zoomIn: "Aumentar",
    zoomOut: "Diminuir",
    zoomReset: "Redefinir zoom",
    compact: "Compacto",
    standard: "Padrão",
    wide: "Largo",
  },
  pt: {
    view: "Visualizar",
    window: "Janela",
    about: "Sobre",
    reload: "Recarregar",
    toggleDevTools: "Alternar ferramentas de desenvolvimento",
    clearSiteData: "Limpar dados do site",
    closeWindow: "Fechar janela",
    quit: "Sair",
    zoomIn: "Aumentar",
    zoomOut: "Diminuir",
    zoomReset: "Redefinir zoom",
    compact: "Compacto",
    standard: "Padrão",
    wide: "Largo",
  },
  ru: {
    view: "Вид",
    window: "Окно",
    about: "О приложении",
    reload: "Перезагрузить",
    toggleDevTools: "Переключить инструменты разработчика",
    clearSiteData: "Очистить данные сайта",
    closeWindow: "Закрыть окно",
    quit: "Выйти",
    zoomIn: "Увеличить",
    zoomOut: "Уменьшить",
    zoomReset: "Сбросить масштаб",
    compact: "Компактный",
    standard: "Стандартный",
    wide: "Широкий",
  },
  ar: {
    view: "عرض",
    window: "نافذة",
    about: "حول",
    reload: "إعادة تحميل",
    toggleDevTools: "تبديل أدوات المطور",
    clearSiteData: "مسح بيانات الموقع",
    closeWindow: "إغلاق النافذة",
    quit: "خروج",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    zoomReset: "إعادة تعيين التكبير",
    compact: "مُدمج",
    standard: "قياسي",
    wide: "واسع",
  },
  tr: {
    view: "Görünüm",
    window: "Pencere",
    about: "Hakkında",
    reload: "Yenile",
    toggleDevTools: "Geliştirici araçlarını aç/kapat",
    clearSiteData: "Site verisini temizle",
    closeWindow: "Pencereyi kapat",
    quit: "Çıkış",
    zoomIn: "Yakınlaştır",
    zoomOut: "Uzaklaştır",
    zoomReset: "Yakınlaştırmayı sıfırla",
    compact: "Kompakt",
    standard: "Standart",
    wide: "Geniş",
  },
  vi: {
    view: "Xem",
    window: "Cửa sổ",
    about: "Giới thiệu",
    reload: "Tải lại",
    toggleDevTools: "Bật/Tắt công cụ nhà phát triển",
    clearSiteData: "Xóa dữ liệu trang",
    closeWindow: "Đóng cửa sổ",
    quit: "Thoát",
    zoomIn: "Phóng to",
    zoomOut: "Thu nhỏ",
    zoomReset: "Đặt lại tỷ lệ",
    compact: "Gọn",
    standard: "Tiêu chuẩn",
    wide: "Rộng",
  },
  id: {
    view: "Tampilan",
    window: "Jendela",
    about: "Tentang",
    reload: "Muat Ulang",
    toggleDevTools: "Buka alat pengembang",
    clearSiteData: "Hapus data situs",
    closeWindow: "Tutup jendela",
    quit: "Keluar",
    zoomIn: "Perbesar",
    zoomOut: "Perkecil",
    zoomReset: "Atur ulang zoom",
    compact: "Kompak",
    standard: "Standar",
    wide: "Lebar",
  },
  th: {
    view: "มุมมอง",
    window: "หน้าต่าง",
    about: "เกี่ยวกับ",
    reload: "โหลดใหม่",
    toggleDevTools: "สลับโหมดนักพัฒนา",
    clearSiteData: "ลบข้อมูลไซต์",
    closeWindow: "ปิดหน้าต่าง",
    quit: "ออก",
    zoomIn: "ซูมเข้า",
    zoomOut: "ซูมออก",
    zoomReset: "รีเซ็ตซูม",
    compact: "กะทัดรัด",
    standard: "มาตรฐาน",
    wide: "กว้าง",
  },
  nl: {
    view: "Weergave",
    window: "Venster",
    about: "Over",
    reload: "Vernieuwen",
    toggleDevTools: "Ontwikkelhulpmiddelen in-/uitschakelen",
    clearSiteData: "Sitegegevens wissen",
    closeWindow: "Venster sluiten",
    quit: "Afsluiten",
    zoomIn: "Vergroten",
    zoomOut: "Verkleinen",
    zoomReset: "Zoom resetten",
    compact: "Compact",
    standard: "Standaard",
    wide: "Breed",
  },
  sv: {
    view: "Vy",
    window: "Fönster",
    about: "Om",
    reload: "Uppdatera",
    toggleDevTools: "Växla utvecklingsverktyg",
    clearSiteData: "Rensa webbplatsdata",
    closeWindow: "Stäng fönster",
    quit: "Avsluta",
    zoomIn: "Zooma in",
    zoomOut: "Zooma ut",
    zoomReset: "Återställ zoom",
    compact: "Kompakt",
    standard: "Standard",
    wide: "Bred",
  },
  no: {
    view: "Visning",
    window: "Vindu",
    about: "Om",
    reload: "Oppdater",
    toggleDevTools: "Bytt utviklerverktøy",
    clearSiteData: "Slett nettdatadata",
    closeWindow: "Lukk vindu",
    quit: "Avslutt",
    zoomIn: "Zoom inn",
    zoomOut: "Zoom ut",
    zoomReset: "Tilbakestill zoom",
    compact: "Kompakt",
    standard: "Standard",
    wide: "Bred",
  },
  da: {
    view: "Visning",
    window: "Vindue",
    about: "Om",
    reload: "Opdater",
    toggleDevTools: "Skift udviklerredskaber",
    clearSiteData: "Ryd side-data",
    closeWindow: "Luk vindue",
    quit: "Afslut",
    zoomIn: "Zoom ind",
    zoomOut: "Zoom ud",
    zoomReset: "Nulstil zoom",
    compact: "Kompakt",
    standard: "Standard",
    wide: "Bred",
  },
  fi: {
    view: "Näytä",
    window: "Ikkuna",
    about: "Tietoja",
    reload: "Lataa uudelleen",
    toggleDevTools: "Vaihda kehittäjätyökalut",
    clearSiteData: "Tyhjennä sivuston tiedot",
    closeWindow: "Sulje ikkuna",
    quit: "Lopeta",
    zoomIn: "Lähennä",
    zoomOut: "Loitonna",
    zoomReset: "Palauta zoom",
    compact: "Kompakti",
    standard: "Vakio",
    wide: "Leveä",
  },
};

const normalizeLocale = (value?: string) => value?.trim().toLowerCase().replace(/_/g, "-") ?? "";

const resolveLocalePreset = (locale?: string) => {
  const normalized = normalizeLocale(locale);
  return (
    PRESET_MENU_I18N[normalized] ??
    PRESET_MENU_I18N[normalized.split("-")[0]] ??
    PRESET_MENU_I18N.en
  );
};

const resolveMenuLocale = (localeConfig: MenuLocaleConfig = {}, locale?: string) => {
  const output: Record<keyof BuiltinMenuLocale, string> = {
    ...DEFAULT_MENU_I18N,
    ...resolveLocalePreset(locale),
  };

  for (const key of Object.keys(DEFAULT_MENU_I18N) as Array<keyof BuiltinMenuLocale>) {
    const override = localeConfig[key];
    if (typeof override === "string" && override.trim()) {
      output[key] = override.trim();
    }
  }

  return output;
};

export function buildMenu(
  appName: string,
  isMacOS: boolean,
  showAboutMenu: boolean,
  aboutItems: AboutMenuConfig,
  menuLocale: MenuLocaleConfig = {},
  appLocale?: string,
) {
  const localized = resolveMenuLocale(menuLocale, appLocale);

  ApplicationMenu.setApplicationMenu([
    {
      label: appName,
      submenu: [
        { label: localized.reload, action: "reload", accelerator: "r" },
        {
          label: localized.toggleDevTools,
          action: "toggle-devtools",
          accelerator: "i",
        },
        { label: localized.clearSiteData, action: "clear-data" },
        ...(isMacOS
          ? [
              { type: "separator" as const },
              { label: localized.closeWindow, action: "close-main-window", accelerator: "w" },
            ]
          : []),
        { type: "separator" as const },
        { label: localized.quit, action: "quit-app", accelerator: "q" },
      ],
    },
    {
      label: localized.view,
      submenu: [
        { label: localized.zoomIn, action: "zoom-in", accelerator: "+" },
        { label: localized.zoomOut, action: "zoom-out", accelerator: "-" },
        { label: localized.zoomReset, action: "zoom-reset", accelerator: "0" },
      ],
    },
    {
      label: localized.window,
      submenu: [
        ...(isMacOS
          ? [
              { role: "minimize" },
              { role: "zoom" },
              { role: "bringAllToFront" },
              { type: "separator" as const },
            ]
          : []),
        { label: localized.compact, action: "window-compact" },
        { label: localized.standard, action: "window-standard" },
        { label: localized.wide, action: "window-wide" },
      ],
    },
    ...(showAboutMenu
      ? [
          {
            label: localized.about,
            submenu: aboutItems.map((item) => {
              if (item.type === "separator") {
                return { type: "separator" as const };
              }

              return {
                label: item.label,
                action: `${OPEN_URL_PREFIX}${encodeURIComponent(item.url)}`,
              };
            }),
          },
        ]
      : []),
  ]);
}

export function handleMenuAction(action: string, handlers: MenuHandlers) {
  if (action.startsWith(OPEN_URL_PREFIX)) {
    const raw = action.slice(OPEN_URL_PREFIX.length);
    try {
      handlers.openUrl(decodeURIComponent(raw));
    } catch {
      handlers.openUrl(raw);
    }
    return;
  }

  switch (action) {
    case "reload":
      handlers.reload();
      return;
    case "toggle-devtools":
      handlers.toggleDevTools();
      return;
    case "zoom-in":
      handlers.zoomIn();
      return;
    case "zoom-out":
      handlers.zoomOut();
      return;
    case "zoom-reset":
      handlers.zoomReset();
      return;
    case "window-compact":
      handlers.windowCompact();
      return;
    case "window-standard":
      handlers.windowStandard();
      return;
    case "window-wide":
      handlers.windowWide();
      return;
    case "clear-data":
      handlers.clearData();
      return;
    case "close-main-window":
      handlers.closeWindow();
      return;
    case "quit-app":
      handlers.quit();
      return;
    default:
      return;
  }
}
