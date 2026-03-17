import { ApplicationMenu } from "electrobun/bun";

export type MenuHandlers = {
  openUrl: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  goHome: () => void;
  reload: () => void;
  toggleDevTools: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  windowCompact: () => void;
  windowStandard: () => void;
  windowWide: () => void;
  clearData: () => void;
  clearDataAndRestart: () => void;
  closeWindow: () => void;
  quit: () => void;
  openHistoryUrl: (url: string) => void;
  clearHistory: () => void;
  copyUrl: () => void;
  toggleAlwaysOnTop: () => void;
  newWindow: () => void;
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
const OPEN_HISTORY_PREFIX = "open-history:";

type BuiltinMenuLocale = {
  operations: string;
  view: string;
  window: string;
  about: string;
  edit: string;
  back: string;
  forward: string;
  home: string;
  refresh: string;
  history: string;
  clearHistory: string;
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
  copyUrl: string;
  alwaysOnTop: string;
  newWindow: string;
  pasteMatchStyle: string;
  clearCacheRestart: string;
};

const DEFAULT_MENU_I18N: BuiltinMenuLocale = {
  operations: "Actions",
  view: "View",
  window: "Window",
  about: "About",
  edit: "Edit",
  back: "Back",
  forward: "Forward",
  home: "Home",
  refresh: "Refresh",
  history: "History",
  clearHistory: "Clear History",
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
  copyUrl: "Copy URL",
  alwaysOnTop: "Always on Top",
  newWindow: "New Window",
  pasteMatchStyle: "Paste and Match Style",
  clearCacheRestart: "Clear Cache & Restart",
};

const RAW_PRESET_MENU_I18N: Record<string, Partial<BuiltinMenuLocale>> = {
  en: DEFAULT_MENU_I18N,
  "en-us": DEFAULT_MENU_I18N,
  "en-gb": DEFAULT_MENU_I18N,
  "zh-cn": {
    operations: "操作",
    back: "返回",
    forward: "前进",
    home: "主页",
    refresh: "刷新",
    history: "历史",
    clearHistory: "清空历史",
    view: "视图",
    window: "窗口",
    about: "关于",
    edit: "编辑",
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
    copyUrl: "复制网址",
    alwaysOnTop: "窗口置顶",
    newWindow: "新建窗口",
    pasteMatchStyle: "粘贴并匹配样式",
    clearCacheRestart: "清除缓存并重启",
  },
  "zh-hans": {
    operations: "操作",
    back: "返回",
    forward: "前进",
    home: "主页",
    refresh: "刷新",
    history: "历史",
    clearHistory: "清空历史",
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
    operations: "操作",
    back: "返回",
    forward: "前進",
    home: "主頁",
    refresh: "刷新",
    history: "歷史",
    clearHistory: "清除歷史",
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
    operations: "操作",
    back: "返回",
    forward: "前進",
    home: "首頁",
    refresh: "重新整理",
    history: "歷史紀錄",
    clearHistory: "清除歷史紀錄",
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
    operations: "操作",
    back: "返回",
    forward: "前進",
    home: "首頁",
    refresh: "重新整理",
    history: "歷史紀錄",
    clearHistory: "清除歷史紀錄",
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
    operations: "操作",
    back: "返回",
    forward: "前进",
    home: "主页",
    refresh: "刷新",
    history: "历史",
    clearHistory: "清空历史",
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
    operations: "アクション",
    back: "戻る",
    forward: "進む",
    home: "ホーム",
    refresh: "更新",
    history: "履歴",
    clearHistory: "履歴を消去",
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
    operations: "アクション",
    back: "戻る",
    forward: "進む",
    home: "ホーム",
    refresh: "更新",
    history: "履歴",
    clearHistory: "履歴を消去",
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
    operations: "동작",
    back: "뒤로",
    forward: "앞으로",
    home: "홈",
    refresh: "새로고침",
    history: "기록",
    clearHistory: "기록 지우기",
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
    operations: "동작",
    back: "뒤로",
    forward: "앞으로",
    home: "홈",
    refresh: "새로고침",
    history: "기록",
    clearHistory: "기록 지우기",
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
    operations: "Actions",
    back: "Retour",
    forward: "Suivant",
    home: "Accueil",
    refresh: "Actualiser",
    history: "Historique",
    clearHistory: "Effacer l'historique",
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
    operations: "Actions",
    back: "Retour",
    forward: "Suivant",
    home: "Accueil",
    refresh: "Actualiser",
    history: "Historique",
    clearHistory: "Effacer l'historique",
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
    operations: "Aktionen",
    back: "Zurück",
    forward: "Weiter",
    home: "Startseite",
    refresh: "Aktualisieren",
    history: "Verlauf",
    clearHistory: "Verlauf löschen",
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
    operations: "Aktionen",
    back: "Zurück",
    forward: "Weiter",
    home: "Startseite",
    refresh: "Aktualisieren",
    history: "Verlauf",
    clearHistory: "Verlauf löschen",
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
    operations: "Acciones",
    back: "Atrás",
    forward: "Adelante",
    home: "Inicio",
    refresh: "Actualizar",
    history: "Historial",
    clearHistory: "Borrar historial",
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
    operations: "Acciones",
    back: "Atrás",
    forward: "Adelante",
    home: "Inicio",
    refresh: "Actualizar",
    history: "Historial",
    clearHistory: "Borrar historial",
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
    operations: "Azioni",
    back: "Indietro",
    forward: "Avanti",
    home: "Home",
    refresh: "Aggiorna",
    history: "Cronologia",
    clearHistory: "Cancella cronologia",
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
    operations: "Azioni",
    back: "Indietro",
    forward: "Avanti",
    home: "Home",
    refresh: "Aggiorna",
    history: "Cronologia",
    clearHistory: "Cancella cronologia",
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
    operations: "Ações",
    back: "Voltar",
    forward: "Avançar",
    home: "Início",
    refresh: "Atualizar",
    history: "Histórico",
    clearHistory: "Limpar histórico",
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
    operations: "Ações",
    back: "Voltar",
    forward: "Avançar",
    home: "Início",
    refresh: "Recarregar",
    history: "Histórico",
    clearHistory: "Limpar histórico",
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
    operations: "Ações",
    back: "Voltar",
    forward: "Avançar",
    home: "Início",
    refresh: "Recarregar",
    history: "Histórico",
    clearHistory: "Limpar histórico",
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
    operations: "Действия",
    back: "Назад",
    forward: "Вперед",
    home: "Главная",
    refresh: "Обновить",
    history: "История",
    clearHistory: "Очистить историю",
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
    operations: "إجراءات",
    back: "عودة",
    forward: "التالي",
    home: "الرئيسية",
    refresh: "تحديث",
    history: "السجل",
    clearHistory: "مسح السجل",
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
    operations: "İşlemler",
    back: "Geri",
    forward: "İleri",
    home: "Ana Sayfa",
    refresh: "Yenile",
    history: "Geçmiş",
    clearHistory: "Geçmişi temizle",
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
    operations: "Tác vụ",
    back: "Quay lại",
    forward: "Tiến tới",
    home: "Trang chủ",
    refresh: "Làm mới",
    history: "Lịch sử",
    clearHistory: "Xóa lịch sử",
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
    operations: "Aksi",
    back: "Kembali",
    forward: "Maju",
    home: "Beranda",
    refresh: "Segarkan",
    history: "Riwayat",
    clearHistory: "Bersihkan riwayat",
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
    operations: "การดำเนินการ",
    back: "ย้อนกลับ",
    forward: "ไปข้างหน้า",
    home: "หน้าแรก",
    refresh: "โหลดใหม่",
    history: "ประวัติ",
    clearHistory: "ล้างประวัติ",
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
    operations: "Acties",
    back: "Terug",
    forward: "Verder",
    home: "Startpagina",
    refresh: "Vernieuwen",
    history: "Geschiedenis",
    clearHistory: "Geschiedenis wissen",
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
    operations: "Åtgärder",
    back: "Tillbaka",
    forward: "Framåt",
    home: "Hem",
    refresh: "Uppdatera",
    history: "Historik",
    clearHistory: "Rensa historik",
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
    operations: "Handlinger",
    back: "Tilbake",
    forward: "Fremover",
    home: "Hjem",
    refresh: "Oppdater",
    history: "Historikk",
    clearHistory: "Tøm historikk",
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
    operations: "Handlinger",
    back: "Tilbage",
    forward: "Frem",
    home: "Hjem",
    refresh: "Opdater",
    history: "Historik",
    clearHistory: "Ryd historik",
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
    operations: "Toiminnot",
    back: "Takaisin",
    forward: "Eteenpäin",
    home: "Etusivu",
    refresh: "Lataa uudelleen",
    history: "Historia",
    clearHistory: "Tyhjennä historia",
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

export type NavigationHistoryItem = {
  url: string;
  title: string;
};

const PRESET_MENU_I18N: Record<string, BuiltinMenuLocale> = (() => {
  const normalized: Record<string, BuiltinMenuLocale> = {};
  for (const [key, value] of Object.entries(RAW_PRESET_MENU_I18N)) {
    normalized[key] = {
      ...DEFAULT_MENU_I18N,
      ...value,
    };
  }
  return normalized;
})();

const MAX_HISTORY_LABEL_LENGTH = 60;

const truncateHistoryLabel = (value: string) => {
  const normalized = value.trim();
  if (normalized.length <= MAX_HISTORY_LABEL_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, MAX_HISTORY_LABEL_LENGTH - 1)}…`;
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

export type MenuOptions = {
  multiWindow?: boolean;
  alwaysOnTop?: boolean;
};

export function buildMenu(
  appName: string,
  isMacOS: boolean,
  showAboutMenu: boolean,
  aboutItems: AboutMenuConfig,
  historyItems: NavigationHistoryItem[],
  menuLocale: MenuLocaleConfig = {},
  appLocale?: string,
  options: MenuOptions = {},
) {
  const localized = resolveMenuLocale(menuLocale, appLocale);
  const historySubmenu = historyItems.map((entry) => ({
    label: truncateHistoryLabel(entry.title?.trim() || entry.url?.trim()),
    action: `${OPEN_HISTORY_PREFIX}${encodeURIComponent(entry.url)}`,
  }));

  const alwaysOnTopLabel = options.alwaysOnTop
    ? `✓ ${localized.alwaysOnTop}`
    : localized.alwaysOnTop;

  ApplicationMenu.setApplicationMenu([
    {
      label: appName,
      submenu: [
        ...(options.multiWindow
          ? [{ label: localized.newWindow, action: "new-window", accelerator: "n" }]
          : []),
        { label: localized.reload, action: "reload", accelerator: "r" },
        {
          label: localized.toggleDevTools,
          action: "toggle-devtools",
          accelerator: "i",
        },
        { label: localized.clearSiteData, action: "clear-data" },
        { label: localized.clearCacheRestart, action: "clear-data-restart" },
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
      label: localized.edit,
      submenu: [
        ...(isMacOS
          ? [
              { role: "undo" },
              { role: "redo" },
              { type: "separator" as const },
              { role: "cut" },
              { role: "copy" },
              { role: "paste" },
              { role: "selectAll" },
              { type: "separator" as const },
              { label: localized.copyUrl, action: "copy-url", accelerator: "l" },
            ]
          : [{ label: localized.copyUrl, action: "copy-url", accelerator: "l" }]),
      ],
    },
    {
      label: localized.view,
      submenu: [
        { label: localized.zoomIn, action: "zoom-in", accelerator: "+" },
        { label: localized.zoomOut, action: "zoom-out", accelerator: "-" },
        { label: localized.zoomReset, action: "zoom-reset", accelerator: "0" },
        ...(isMacOS ? [{ type: "separator" as const }, { role: "togglefullscreen" }] : []),
      ],
    },
    {
      label: localized.operations,
      submenu: [
        { label: localized.back, action: "go-back", accelerator: "[" },
        { label: localized.forward, action: "go-forward", accelerator: "]" },
        { label: localized.home, action: "go-home" },
        { label: localized.refresh, action: "reload" },
        { type: "separator" as const },
        {
          label: localized.history,
          submenu: [
            { label: localized.clearHistory, action: "clear-history" },
            ...(historySubmenu.length > 0
              ? [{ type: "separator" as const }, ...historySubmenu]
              : []),
          ],
        },
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
        { label: alwaysOnTopLabel, action: "toggle-always-on-top" },
        { type: "separator" as const },
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
  if (action.startsWith(OPEN_HISTORY_PREFIX)) {
    const raw = action.slice(OPEN_HISTORY_PREFIX.length);
    try {
      handlers.openHistoryUrl(decodeURIComponent(raw));
    } catch {
      handlers.openHistoryUrl(raw);
    }
    return;
  }

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
    case "go-back":
      handlers.goBack();
      return;
    case "go-forward":
      handlers.goForward();
      return;
    case "go-home":
      handlers.goHome();
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
    case "clear-data-restart":
      handlers.clearDataAndRestart();
      return;
    case "close-main-window":
      handlers.closeWindow();
      return;
    case "quit-app":
      handlers.quit();
      return;
    case "clear-history":
      handlers.clearHistory();
      return;
    case "copy-url":
      handlers.copyUrl();
      return;
    case "toggle-always-on-top":
      handlers.toggleAlwaysOnTop();
      return;
    case "new-window":
      handlers.newWindow();
      return;
    default:
      return;
  }
}
