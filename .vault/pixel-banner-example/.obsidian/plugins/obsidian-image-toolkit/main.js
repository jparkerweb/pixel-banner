'use strict';

var obsidian = require('obsidian');
var crypto = require('crypto');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

// العربية
var ar = {};

// čeština
var cz = {};

// Dansk
var da = {};

// Deutsch
var de = {};

// English
var en = {
    // settings
    IMAGE_TOOLKIT_SETTINGS_TITLE: 'Image Toolkit Settings',
    // >>>Common Settings:
    COMMON_SETTINGS: 'Common Settings:',
    VIEW_MODE_NAME: 'Choose a mode to view images',
    VIEW_MODE_NORMAL: '🖼 Normal',
    VIEW_MODE_PIN: '📌 Pin',
    // >>>View Trigger Settings:
    VIEW_TRIGGER_SETTINGS: 'View Trigger Settings:',
    VIEW_IMAGE_GLOBAL_NAME: 'Click and view an image globally',
    VIEW_IMAGE_GLOBAL_DESC: 'You can zoom, rotate, drag, and invert it on the popup layer when clicking an image.',
    VIEW_IMAGE_IN_EDITOR_NAME: 'Click and view an image in the Editor Area',
    VIEW_IMAGE_IN_EDITOR_DESC: 'Turn on this option if you want to click and view an image in the Editor Area.',
    // CPB = COMMUNITY_PLUGINS_BROWSER
    VIEW_IMAGE_IN_CPB_NAME: 'Click and view an image in the Community Plugins browser',
    VIEW_IMAGE_IN_CPB_DESC: 'Turn on this option if you want to click and view an image in the Community Plugins browser.',
    VIEW_IMAGE_WITH_A_LINK_NAME: 'Click and view an image with a link',
    VIEW_IMAGE_WITH_A_LINK_DESC: 'Turn on this option if you want to click and view an image with a link. (NOTE: The browser will be opened for you to visit the link and the image will be popped up for being viewed at the same time when you click the image.)',
    VIEW_IMAGE_OTHER_NAME: 'Click and view in the other areas except the above',
    VIEW_IMAGE_OTHER_DESC: 'Except for the above mentioned, it also supports other areas, like some modal user interface components.',
    // >>> PIN_MODE_SETTINGS
    PIN_MODE_SETTINGS: "Pin Mode Settings:",
    PIN_MODE_NAME: "📌 Pin an image",
    PIN_MODE_DESC: "You can pin an image onto the top of the screen. And have more options by right click. (press Esc to close the image where your mouse cursor is hovering)",
    PIN_MAXIMUM_NAME: "The maximum images you can pin",
    PIN_COVER_NAME: "Cover mode",
    PIN_COVER_DESC: "After those pinned images reach maximum, you can cover the earliest pinned image when you click an image once again.",
    PIN_MAXIMUM_NOTICE: "Exceeded maximum images you can pin (non cover mode)",
    // >>>View Detail Settings:
    VIEW_DETAILS_SETTINGS: 'View Detail Settings:',
    IMAGE_MOVE_SPEED_NAME: 'Set the moving speed of the image',
    IMAGE_MOVE_SPEED_DESC: 'When you move an image on the popup layer by keyboard (up, down, left, right), the moving speed of the image can be set here.',
    IMAGE_TIP_TOGGLE_NAME: "Display the image's zoom number",
    IMAGE_TIP_TOGGLE_DESC: "Turn on this option if you want to display the zoom number when you zoom the image.",
    IMG_FULL_SCREEN_MODE_NAME: 'Full-screen preview mode',
    // preview mode options:
    FIT: 'Fit',
    FILL: 'Fill',
    STRETCH: 'Stretch',
    IMG_VIEW_BACKGROUND_COLOR_NAME: "Set the background color of the previewed image (Only support the image with transparent background)",
    // >>>Image Border Settings:
    IMAGE_BORDER_SETTINGS: 'Image Border Settings:',
    IMAGE_BORDER_TOGGLE_NAME: "Display the image's border",
    IMAGE_BORDER_TOGGLE_DESC: "The clicked image's border can be displayed after you exit previewing and close the popup layer.",
    IMAGE_BORDER_WIDTH_NAME: "Set the image's border width",
    IMAGE_BORDER_STYLE_NAME: "Set the image's border style",
    IMAGE_BORDER_COLOR_NAME: "Set the image's border color",
    // IMG_BORDER_WIDTH options:
    THIN: 'thin',
    MEDIUM: 'medium',
    THICK: 'thick',
    // IMG_BORDER_STYLE options:
    //HIDDEN: 'hidden',
    DOTTED: 'dotted',
    DASHED: 'dashed',
    SOLID: 'solid',
    DOUBLE: 'double',
    GROOVE: 'groove',
    RIDGE: 'ridge',
    INSET: 'inset',
    OUTSET: 'outset',
    // IMAGE_BORDER_COLOR_NAME options:
    BLACK: 'black',
    BLUE: 'blue',
    DARK_GREEN: 'dark green',
    GREEN: 'green',
    LIME: 'lime',
    STEEL_BLUE: 'steel blue',
    INDIGO: 'indigo',
    PURPLE: 'purple',
    GRAY: 'gray',
    DARK_RED: 'dark red',
    LIGHT_GREEN: 'light green',
    BROWN: 'brown',
    LIGHT_BLUE: 'light blue',
    SILVER: 'silver',
    RED: 'red',
    PINK: 'pink',
    ORANGE: 'orange',
    GOLD: 'gold',
    YELLOW: 'yellow',
    // >>>Gallery Navbar Settings:
    GALLERY_NAVBAR_SETTINGS: 'Gallery Navbar Settings (Experimental):',
    GALLERY_NAVBAR_TOGGLE_NAME: "Display gallery navbar",
    GALLERY_NAVBAR_TOGGLE_DESC: "All of the images in the current pane view can be displayed at the bottom of the popup layer.",
    GALLERY_NAVBAR_DEFAULT_COLOR_NAME: "Set the background color of the gallery navbar (default state)",
    GALLERY_NAVBAR_HOVER_COLOR_NAME: "Set the background color of the gallery navbar (hovering state)",
    GALLERY_IMG_BORDER_TOGGLE_NAME: "Display the selected image on the gallery navbar",
    GALLERY_IMG_BORDER_TOGGLE_DESC: "When you select an image, the image's border will be displayed, so you can know which image is currently active.",
    GALLERY_IMG_BORDER_ACTIVE_COLOR_NAME: 'Set the border color of the selected image',
    // >>>HOTKEYS_SETTINGS:
    HOTKEY_SETTINGS: "Hotkey Settings:",
    HOTKEY_SETTINGS_DESC: "📢 You cannot set the same hotkey for 'Move the image' and 'Switch the image' at the same time. (NOT SUPPORT in Pin Mode)",
    MOVE_THE_IMAGE_NAME: "Set the hotkey for moving the image",
    MOVE_THE_IMAGE_DESC: "You can move the image on the popup layer by hotkey.",
    SWITCH_THE_IMAGE_NAME: "Set the hotkey for switching the image",
    SWITCH_THE_IMAGE_DESC: "You can switch to the previous/next image on the gallery navbar by hotkey. (NOTE: You need to turn on 'Display gallery navbar' first, if you wanna use this hotkey.)",
    DOUBLE_CLICK_TOOLBAR_NAME: "Double click",
    VIEW_TRIGGER_HOTKEY_NAME: "Set the hotkey for triggering viewing an image",
    VIEW_TRIGGER_HOTKEY_DESC: "When you set 'None', you can directly click and preview an image without holding any modifier keys; otherwise, you must hold the configured modifier keys to click and preview an image.",
    // MODIFIER_HOTKEYS
    NONE: "None",
    CTRL: "Ctrl",
    ALT: "Alt",
    SHIFT: "Shift",
    CTRL_ALT: "Ctrl+Alt",
    CTRL_SHIFT: "Ctrl+Shift",
    SHIFT_ALT: "Shift+Alt",
    CTRL_SHIFT_ALT: "Ctrl+Shift+Alt",
    // toolbar icon title
    ZOOM_TO_100: "zoom to 100%",
    ZOOM_IN: "zoom in",
    ZOOM_OUT: "zoom out",
    FULL_SCREEN: 'full screen',
    REFRESH: "refresh",
    ROTATE_LEFT: "rotate left",
    ROTATE_RIGHT: "rotate right",
    SCALE_X: 'flip along x-axis',
    SCALE_Y: 'flip along y-axis',
    INVERT_COLOR: 'invert color',
    COPY: 'copy',
    CLOSE: 'close',
    // tip:
    COPY_IMAGE_SUCCESS: 'Copy the image successfully!',
    COPY_IMAGE_ERROR: 'Fail to copy the image!'
};

// British English
var enGB = {};

// Español
var es = {};

// français
var fr = {};

// हिन्दी
var hi = {};

// Bahasa Indonesia
var id = {};

// Italiano
var it = {};

// 日本語
var ja = {};

// 한국어
var ko = {};

// Nederlands
var nl = {};

// Norsk
var no = {};

// język polski	
var pl = {};

// Português
var pt = {};

// Português do Brasil
// Brazilian Portuguese
var ptBR = {};

// Română
var ro = {};

// русский
var ru = {};

// Türkçe
var tr = {};

// 简体中文
var zhCN = {
    // settings
    IMAGE_TOOLKIT_SETTINGS_TITLE: "Image Toolkit 设置",
    // >>>Common Settings:
    COMMON_SETTINGS: '通用设置：',
    VIEW_MODE_NAME: '选择查看模式',
    VIEW_MODE_NORMAL: '🖼 普通',
    VIEW_MODE_PIN: '📌 贴图',
    // >>> 预览触发配置：
    VIEW_TRIGGER_SETTINGS: '预览触发配置：',
    VIEW_IMAGE_GLOBAL_NAME: '支持全局预览图片',
    VIEW_IMAGE_GLOBAL_DESC: '开启后，在任何地方点击图片都可以弹出预览界面，可对图片进行缩放、旋转、拖动、和反色等。',
    VIEW_IMAGE_IN_EDITOR_NAME: '支持在编辑区域预览图片',
    VIEW_IMAGE_IN_EDITOR_DESC: '开启后，支持在编辑区域，点击图片预览。',
    // CPB = COMMUNITY_PLUGINS_BROWSER
    VIEW_IMAGE_IN_CPB_NAME: '支持在社区插件页面预览图片',
    VIEW_IMAGE_IN_CPB_DESC: '开启后，支持在社区插件页面，点击图片预览。',
    VIEW_IMAGE_WITH_A_LINK_NAME: '支持预览带链接的图片',
    VIEW_IMAGE_WITH_A_LINK_DESC: '开启后，支持点击带链接的图片（注意：点击该图片，会同时打开浏览器访问指定地址和弹出预览图片）',
    VIEW_IMAGE_OTHER_NAME: '支持除上述其他地方来预览图片',
    VIEW_IMAGE_OTHER_DESC: '除上述支持范围外，还支持一些其他区域，如Modal用户界面组件。',
    // >>> PIN_MODE_SETTINGS
    PIN_MODE_SETTINGS: "贴图模式设置：",
    PIN_MODE_NAME: "📌 将所点击的图片贴到屏幕上",
    PIN_MODE_DESC: "你可以将当前所点击的图片贴到屏幕上，并且可以通过右击图片选择更多操作（按 Esc 关闭已贴图片的展示）",
    PIN_MAXIMUM_NAME: "最大贴图数量",
    PIN_COVER_NAME: "覆盖模式",
    PIN_COVER_DESC: "当贴图数量达到最大值后，此时再次点击图片，该图片会覆盖最早弹出的那个贴图。",
    PIN_MAXIMUM_NOTICE: "超过最大Pin图设置（非覆盖模式）",
    // >>>查看细节设置：
    VIEW_DETAILS_SETTINGS: '查看细节设置：',
    IMAGE_MOVE_SPEED_NAME: '图片移动速度设置',
    IMAGE_MOVE_SPEED_DESC: '当使用键盘（上、下、左、右）移动图片时，可对图片移动速度进行设置。',
    IMAGE_TIP_TOGGLE_NAME: "展示缩放比例提示",
    IMAGE_TIP_TOGGLE_DESC: "开启后，当你缩放图片时会展示当前缩放的比例。",
    IMG_FULL_SCREEN_MODE_NAME: '全屏预览模式',
    // 全屏预览模式 下拉：
    FIT: '自适应',
    FILL: '填充',
    STRETCH: '拉伸',
    IMG_VIEW_BACKGROUND_COLOR_NAME: "设置预览图片的背景色（仅对透明背景的图片生效）",
    // >>>图片边框设置：
    IMAGE_BORDER_SETTINGS: '图片边框设置：',
    IMAGE_BORDER_TOGGLE_NAME: "展示被点击图片的边框",
    IMAGE_BORDER_TOGGLE_DESC: "当离开图片预览和关闭弹出层后，突出展示被点击图片的边框。",
    IMAGE_BORDER_WIDTH_NAME: "设置图片边框宽度",
    IMAGE_BORDER_STYLE_NAME: "设置图片边框样式",
    IMAGE_BORDER_COLOR_NAME: "设置图片边框颜色",
    // IMG_BORDER_WIDTH 下拉：
    THIN: '较细',
    MEDIUM: '正常',
    THICK: '较粗',
    // IMG_BORDER_STYLE  下拉：
    //HIDDEN: '隐藏',
    DOTTED: '点状',
    DASHED: '虚线',
    SOLID: '实线',
    DOUBLE: '双线',
    GROOVE: '凹槽',
    RIDGE: ' 垄状',
    INSET: '凹边',
    OUTSET: '凸边',
    // IMAGE_BORDER_COLOR_NAME  下拉：
    BLACK: '黑色',
    BLUE: '蓝色',
    DARK_GREEN: '深绿色',
    GREEN: '绿色',
    LIME: '淡黄绿色',
    STEEL_BLUE: '钢青色',
    INDIGO: '靛蓝色',
    PURPLE: '紫色',
    GRAY: '灰色',
    DARK_RED: '深红色',
    LIGHT_GREEN: '浅绿色',
    BROWN: '棕色',
    LIGHT_BLUE: '浅蓝色',
    SILVER: '银色',
    RED: '红色',
    PINK: '粉红色',
    ORANGE: '橘黄色',
    GOLD: '金色',
    YELLOW: '黄色',
    // >>>Gallery Navbar Settings:
    GALLERY_NAVBAR_SETTINGS: '图片导航设置 (体验版):',
    GALLERY_NAVBAR_TOGGLE_NAME: "展示图片导航",
    GALLERY_NAVBAR_TOGGLE_DESC: "当前文档的所有图片会展示在弹出层的底部，可随意切换展示不同图片。",
    GALLERY_NAVBAR_DEFAULT_COLOR_NAME: "设置图片导航底栏背景色（默认展示）",
    GALLERY_NAVBAR_HOVER_COLOR_NAME: "设置图片导航底栏背景色（鼠标悬浮时）",
    GALLERY_IMG_BORDER_TOGGLE_NAME: "展示图片导航上被选中的图片",
    GALLERY_IMG_BORDER_TOGGLE_DESC: "当你选中正查看某一图片，对应图片导航底栏上将突出显示该缩略图片的边框。",
    GALLERY_IMG_BORDER_ACTIVE_COLOR_NAME: '设置被选中图片的边框色',
    // >>>HOTKEYS_SETTINGS:
    HOTKEY_SETTINGS: "快捷键设置:",
    HOTKEY_SETTINGS_DESC: "📢  你无法为'移动图片'和'切换图片'设置相同的快捷键。（不支持贴图模式）",
    MOVE_THE_IMAGE_NAME: "为移动图片设置快捷键",
    MOVE_THE_IMAGE_DESC: "你可以利用快捷键来移动弹出层上的图片。",
    SWITCH_THE_IMAGE_NAME: "为切换图片设置快捷键",
    SWITCH_THE_IMAGE_DESC: "你可以利用快捷键来切换在图片导航栏上的图片至上一张/下一张。(注意: 仅当开启“展示图片导航”后，才能使用该快捷键来控制切换图片。)",
    DOUBLE_CLICK_TOOLBAR_NAME: "双击",
    VIEW_TRIGGER_HOTKEY_NAME: "为触发弹出查看图片设置快捷键",
    VIEW_TRIGGER_HOTKEY_DESC: "当你设置为“无”，你可以直接点击预览图片；否则，须按住已配置的修改键（Ctrl、Alt、Shift）才能点击查看某个图片。",
    // MODIFIER_HOTKEYS
    NONE: "无",
    // toolbar icon title
    ZOOM_TO_100: "缩放至100%",
    ZOOM_IN: "放大",
    ZOOM_OUT: "缩小",
    FULL_SCREEN: "全屏",
    REFRESH: "刷新",
    ROTATE_LEFT: "左旋",
    ROTATE_RIGHT: "右旋",
    SCALE_X: 'x轴翻转',
    SCALE_Y: 'y轴翻转',
    INVERT_COLOR: '反色',
    COPY: '复制',
    CLOSE: '关闭',
    // tip:
    COPY_IMAGE_SUCCESS: '拷贝图片成功！',
    COPY_IMAGE_ERROR: '拷贝图片失败！'
};

// 繁體中文
var zhTW = {
    // settings
    IMAGE_TOOLKIT_SETTINGS_TITLE: "image toolkit 設定",
    // toolbar icon title
    ZOOM_IN: "放大",
    ZOOM_OUT: "縮小",
    FULL_SCREEN: '全螢幕',
    REFRESH: "重整",
    ROTATE_LEFT: "向左旋轉",
    ROTATE_RIGHT: "向右旋轉",
    SCALE_X: 'x 軸縮放',
    SCALE_Y: 'y 軸縮放',
    INVERT_COLOR: '色彩反轉',
    COPY: '複製',
    COPY_IMAGE_SUCCESS: '成功複製圖片！'
};

const localeMap = {
    ar,
    cs: cz,
    da,
    de,
    en,
    "en-gb": enGB,
    es,
    fr,
    hi,
    id,
    it,
    ja,
    ko,
    nl,
    nn: no,
    pl,
    pt,
    "pt-br": ptBR,
    ro,
    ru,
    tr,
    "zh-cn": zhCN,
    "zh-tw": zhTW,
};
const locale = localeMap[obsidian.moment.locale()];
function t(str) {
    if (!locale) {
        console.error("[oit] Image toolkit locale not found", obsidian.moment.locale());
    }
    return (locale && locale[str]) || en[str];
}

var ViewMode;
(function (ViewMode) {
    ViewMode["Normal"] = "Normal";
    ViewMode["Pin"] = "Pin";
})(ViewMode || (ViewMode = {}));
const DEFAULT_VIEW_MODE = ViewMode.Normal;
const OIT_CLASS = {
    CONTAINER_ROOT: 'oit',
    CONTAINER_NORMAL: 'oit-normal',
    CONTAINER_PIN: 'oit-pin',
    // the place for storing images
    IMG_CONTAINER: 'oit-img-container',
    IMG_VIEW: 'oit-img-view',
    IMG_TTP: 'oit-img-tip',
    IMG_FOOTER: 'oit-img-footer',
    IMG_TITLE: 'oit-img-title',
    IMG_TITLE_NAME: 'oit-img-title-name',
    IMG_TITLE_INDEX: 'oit-img-title-index',
    IMG_TOOLBAR: 'oit-img-toolbar',
    IMG_PLAYER: 'img-player',
    IMG_FULLSCREEN: 'img-fullscreen',
};
const ZOOM_FACTOR = 0.8;
const IMG_VIEW_MIN = 30;
const ICONS = [{
        id: 'zoom-to-100',
        svg: `<g> <path id="svg_1" d="m42,6c-18.8,0 -34,15.2 -34,34s15.2,34 34,34c7.4,0 14.3,-2.4 19.9,-6.4l26.3,26.3l5.6,-5.6l-26,-26.1c5.1,-6 8.2,-13.7 8.2,-22.1c0,-18.9 -15.2,-34.1 -34,-34.1zm0,4c16.6,0 30,13.4 30,30s-13.4,30 -30,30s-30,-13.4 -30,-30s13.4,-30 30,-30z" stroke-width="2" stroke="currentColor" fill="currentColor"/> <text font-weight="bold" xml:space="preserve" text-anchor="start" font-family="Noto Sans JP" font-size="24" id="svg_2" y="48.5" x="24" stroke-width="0" stroke="#000" fill="#000000">1:1</text> </g>`
    }];
const SEPARATOR_SYMBOL = "---";
const TOOLBAR_CONF = [{
        title: "ZOOM_TO_100",
        class: 'toolbar_zoom_to_100',
        icon: 'zoom-to-100',
        enableToolbarIcon: true,
        enableMenu: true,
        enableHotKey: true
    }, {
        title: "ZOOM_IN",
        class: 'toolbar_zoom_in',
        icon: 'zoom-in',
        enableToolbarIcon: true,
        enableMenu: false,
        enableHotKey: true
    }, {
        title: "ZOOM_OUT",
        class: 'toolbar_zoom_out',
        icon: 'zoom-out',
        enableToolbarIcon: true,
        enableMenu: false,
        enableHotKey: true
    }, {
        title: "FULL_SCREEN",
        class: 'toolbar_full_screen',
        icon: 'expand',
        enableToolbarIcon: true,
        enableMenu: true,
        enableHotKey: true
    }, {
        title: "REFRESH",
        class: 'toolbar_refresh',
        icon: 'refresh-ccw',
        enableToolbarIcon: true,
        enableMenu: true,
        enableHotKey: true
    }, {
        title: "ROTATE_LEFT",
        class: 'toolbar_rotate_left',
        icon: 'rotate-ccw',
        enableToolbarIcon: true,
        enableMenu: true,
        enableHotKey: true
    }, {
        title: "ROTATE_RIGHT",
        class: 'toolbar_rotate_right',
        icon: 'rotate-cw',
        enableToolbarIcon: true,
        enableMenu: true,
        enableHotKey: true
    }, {
        title: "SCALE_X",
        class: 'toolbar_scale_x',
        icon: 'move-horizontal',
        enableToolbarIcon: true,
        enableMenu: true,
        enableHotKey: true
    }, {
        title: "SCALE_Y",
        class: 'toolbar_scale_y',
        icon: 'move-vertical',
        enableToolbarIcon: true,
        enableMenu: true,
        enableHotKey: true
    }, {
        title: "INVERT_COLOR",
        class: 'toolbar_invert_color',
        icon: 'droplet',
        enableToolbarIcon: true,
        enableMenu: true,
        enableHotKey: true
    }, {
        title: "COPY",
        class: 'toolbar_copy',
        icon: 'copy',
        enableToolbarIcon: true,
        enableMenu: true,
        enableHotKey: true
    }, {
        title: SEPARATOR_SYMBOL,
        enableToolbarIcon: false,
        enableMenu: true,
        enableHotKey: false
    }, {
        title: "CLOSE",
        class: 'toolbar_close',
        icon: 'trash',
        enableToolbarIcon: false,
        enableMenu: true,
        enableHotKey: true
    }];
const IMG_FULL_SCREEN_MODE = {
    FIT: 'FIT',
    FILL: 'FILL',
    STRETCH: 'STRETCH'
};
const VIEW_IMG_SELECTOR = {
    EDITOR_AREAS: `.workspace-leaf-content[data-type='markdown'] img,.workspace-leaf-content[data-type='image'] img`,
    EDITOR_AREAS_NO_LINK: `.workspace-leaf-content[data-type='markdown'] img:not(a img),.workspace-leaf-content[data-type='image'] img:not(a img)`,
    CPB: `.community-modal-details img`,
    CPB_NO_LINK: `.community-modal-details img:not(a img)`,
    OTHER: `.modal-content img`,
    OTHER_NO_LINK: `.modal-content img:not(a img)`,
};
const IMG_BORDER_WIDTH = {
    THIN: 'thin',
    MEDIUM: 'medium',
    THICK: 'thick'
};
const IMG_BORDER_STYLE = {
    // HIDDEN: 'hidden',
    DOTTED: 'dotted',
    DASHED: 'dashed',
    SOLID: 'solid',
    DOUBLE: 'double',
    GROOVE: 'groove',
    RIDGE: 'ridge',
    INSET: 'inset',
    OUTSET: 'outset'
};
// https://www.runoob.com/cssref/css-colorsfull.html
const IMG_BORDER_COLOR = {
    BLACK: 'black',
    BLUE: 'blue',
    DARK_GREEN: 'darkgreen',
    GREEN: 'green',
    LIME: 'lime',
    STEEL_BLUE: 'steelblue',
    INDIGO: 'indigo',
    PURPLE: 'purple',
    GRAY: 'gray',
    DARK_RED: 'darkred',
    LIGHT_GREEN: 'lightgreen',
    BROWN: 'brown',
    LIGHT_BLUE: 'lightblue',
    SILVER: 'silver',
    RED: 'red',
    PINK: 'pink',
    ORANGE: 'orange',
    GOLD: 'gold',
    YELLOW: 'yellow'
};
const GALLERY_NAVBAR_DEFAULT_COLOR = '#0000001A'; // rgba(0, 0, 0, 0.1)
const GALLERY_NAVBAR_HOVER_COLOR = '#0000004D'; // rgba(0, 0, 0, 0.3)
const GALLERY_IMG_BORDER_ACTIVE_COLOR = '#FF0000'; // red
const MODIFIER_HOTKEYS = {
    NONE: "NONE",
    CTRL: "CTRL",
    ALT: "ALT",
    SHIFT: "SHIFT",
    CTRL_ALT: "CTRL_ALT",
    CTRL_SHIFT: "CTRL_SHIFT",
    SHIFT_ALT: "SHIFT_ALT",
    CTRL_SHIFT_ALT: "CTRL_SHIFT_ALT"
};
const MOVE_THE_IMAGE = {
    CODE: "MOVE_THE_IMAGE",
    DEFAULT_HOTKEY: MODIFIER_HOTKEYS.NONE,
    SVG: `<svg width="56" height="37" xmlns="http://www.w3.org/2000/svg" class="icon"><path fill="none" d="M-1 -1H57V38H-1z"/><g><path stroke="null" fill="#707070" d="M19.001 16.067V1.928C19.001.864 19.865 0 20.93 0h14.142c1.064 0 1.928.864 1.928 1.928v14.14a1.929 1.929 0 01-1.928 1.927H20.929a1.929 1.929 0 01-1.928-1.928zm4.805-5.909l2.908-3.032v7.334c0 .535.43.964.965.964h.642c.535 0 .965-.43.965-.964V7.126l2.908 3.032a.965.965 0 001.378.017l.438-.442a.96.96 0 000-1.362l-5.327-5.33a.96.96 0 00-1.362 0l-5.335 5.33a.96.96 0 000 1.362l.438.441a.97.97 0 001.382-.016zM36.999 20.933v14.139A1.929 1.929 0 0135.07 37H20.929a1.929 1.929 0 01-1.928-1.928v-14.14c0-1.064.864-1.927 1.928-1.927h14.142c1.064 0 1.928.863 1.928 1.928zm-4.805 5.909l-2.908 3.032V22.54a.962.962 0 00-.965-.964h-.642a.962.962 0 00-.965.964v7.334l-2.908-3.032a.965.965 0 00-1.378-.016l-.438.441a.96.96 0 000 1.362l5.327 5.33a.96.96 0 001.362 0l5.335-5.33a.96.96 0 000-1.362l-.438-.441a.97.97 0 00-1.382.016zM16.068 37.001H1.93a1.929 1.929 0 01-1.928-1.928V20.932c0-1.065.864-1.928 1.928-1.928h14.14c1.064 0 1.927.863 1.927 1.928v14.14a1.929 1.929 0 01-1.928 1.93zm-5.908-4.804l-3.033-2.909h7.335c.534 0 .964-.43.964-.964v-.643a.962.962 0 00-.964-.964H7.127l3.033-2.909a.965.965 0 00.016-1.378l-.442-.438a.96.96 0 00-1.362 0l-5.33 5.327a.96.96 0 000 1.362l5.33 5.335a.96.96 0 001.362 0l.442-.438a.97.97 0 00-.016-1.381zM39.932 19.004H54.07c1.064 0 1.928.863 1.928 1.928v14.14a1.929 1.929 0 01-1.928 1.93H39.93a1.929 1.929 0 01-1.927-1.93v-14.14c0-1.065.863-1.928 1.928-1.928zm5.908 4.804l3.033 2.909h-7.335a.962.962 0 00-.964.964v.643c0 .534.43.964.964.964h7.335l-3.033 2.909a.965.965 0 00-.016 1.377l.442.438a.96.96 0 001.362 0l5.33-5.327a.96.96 0 000-1.362l-5.33-5.335a.96.96 0 00-1.362 0l-.442.438a.97.97 0 00.016 1.382z"/></g></svg>`
};
const SWITCH_THE_IMAGE = {
    CODE: "SWITCH_THE_IMAGE",
    DEFAULT_HOTKEY: MODIFIER_HOTKEYS.CTRL,
    SVG: `<svg width="37" height="18" xmlns="http://www.w3.org/2000/svg" class="icon"><path fill="none" d="M-1 -1H38V19H-1z"/><g><path stroke="null" fill="#707070" d="M16.068 17.999H1.93A1.929 1.929 0 01.001 16.07V1.929C.001.865.865.001 1.93.001h14.14c1.064 0 1.927.864 1.927 1.928v14.142a1.929 1.929 0 01-1.928 1.928zm-5.908-4.805l-3.033-2.908h7.335c.534 0 .964-.43.964-.965V8.68a.962.962 0 00-.964-.965H7.127l3.033-2.908a.965.965 0 00.016-1.378l-.442-.438a.96.96 0 00-1.362 0l-5.33 5.327a.96.96 0 000 1.362l5.33 5.335a.96.96 0 001.362 0l.442-.438a.97.97 0 00-.016-1.382zM20.932.001H35.07c1.064 0 1.928.864 1.928 1.928v14.142a1.929 1.929 0 01-1.928 1.928H20.93a1.929 1.929 0 01-1.927-1.928V1.929c0-1.064.863-1.928 1.928-1.928zm5.908 4.805l3.033 2.908h-7.335a.962.962 0 00-.964.965v.642c0 .535.43.965.964.965h7.335l-3.033 2.908a.965.965 0 00-.016 1.378l.442.438a.96.96 0 001.362 0l5.33-5.327a.96.96 0 000-1.362l-5.33-5.335a.96.96 0 00-1.362 0l-.442.438a.97.97 0 00.016 1.382z"/></g></svg>`
};
const IMG_DEFAULT_BACKGROUND_COLOR = '#00000000';

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
}

/*! Pickr 1.9.1 MIT | https://github.com/Simonwep/pickr */

var pickr_min = createCommonjsModule(function (module, exports) {
!function(t,e){module.exports=e();}(self,(()=>(()=>{var t={d:(e,o)=>{for(var n in o)t.o(o,n)&&!t.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:o[n]});},o:(t,e)=>Object.prototype.hasOwnProperty.call(t,e),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});}},e={};t.d(e,{default:()=>E});var o={};function n(t,e,o,n,i={}){e instanceof HTMLCollection||e instanceof NodeList?e=Array.from(e):Array.isArray(e)||(e=[e]),Array.isArray(o)||(o=[o]);for(const s of e)for(const e of o)s[t](e,n,{capture:!1,...i});return Array.prototype.slice.call(arguments,1)}t.r(o),t.d(o,{adjustableInputNumbers:()=>p,createElementFromString:()=>r,createFromTemplate:()=>a,eventPath:()=>l,off:()=>s,on:()=>i,resolveElement:()=>c});const i=n.bind(null,"addEventListener"),s=n.bind(null,"removeEventListener");function r(t){const e=document.createElement("div");return e.innerHTML=t.trim(),e.firstElementChild}function a(t){const e=(t,e)=>{const o=t.getAttribute(e);return t.removeAttribute(e),o},o=(t,n={})=>{const i=e(t,":obj"),s=e(t,":ref"),r=i?n[i]={}:n;s&&(n[s]=t);for(const n of Array.from(t.children)){const t=e(n,":arr"),i=o(n,t?{}:r);t&&(r[t]||(r[t]=[])).push(Object.keys(i).length?i:n);}return n};return o(r(t))}function l(t){let e=t.path||t.composedPath&&t.composedPath();if(e)return e;let o=t.target.parentElement;for(e=[t.target,o];o=o.parentElement;)e.push(o);return e.push(document,window),e}function c(t){return t instanceof Element?t:"string"==typeof t?t.split(/>>/g).reduce(((t,e,o,n)=>(t=t.querySelector(e),o<n.length-1?t.shadowRoot:t)),document):null}function p(t,e=(t=>t)){function o(o){const n=[.001,.01,.1][Number(o.shiftKey||2*o.ctrlKey)]*(o.deltaY<0?1:-1);let i=0,s=t.selectionStart;t.value=t.value.replace(/[\d.]+/g,((t,o)=>o<=s&&o+t.length>=s?(s=o,e(Number(t),n,i)):(i++,t))),t.focus(),t.setSelectionRange(s,s),o.preventDefault(),t.dispatchEvent(new Event("input"));}i(t,"focus",(()=>i(window,"wheel",o,{passive:!1}))),i(t,"blur",(()=>s(window,"wheel",o)));}const{min:u,max:h,floor:d,round:m}=Math;function f(t,e,o){e/=100,o/=100;const n=d(t=t/360*6),i=t-n,s=o*(1-e),r=o*(1-i*e),a=o*(1-(1-i)*e),l=n%6;return [255*[o,r,s,s,a,o][l],255*[a,o,o,r,s,s][l],255*[s,s,a,o,o,r][l]]}function v(t,e,o){const n=(2-(e/=100))*(o/=100)/2;return 0!==n&&(e=1===n?0:n<.5?e*o/(2*n):e*o/(2-2*n)),[t,100*e,100*n]}function b(t,e,o){const n=u(t/=255,e/=255,o/=255),i=h(t,e,o),s=i-n;let r,a;if(0===s)r=a=0;else {a=s/i;const n=((i-t)/6+s/2)/s,l=((i-e)/6+s/2)/s,c=((i-o)/6+s/2)/s;t===i?r=c-l:e===i?r=1/3+n-c:o===i&&(r=2/3+l-n),r<0?r+=1:r>1&&(r-=1);}return [360*r,100*a,100*i]}function y(t,e,o,n){e/=100,o/=100;return [...b(255*(1-u(1,(t/=100)*(1-(n/=100))+n)),255*(1-u(1,e*(1-n)+n)),255*(1-u(1,o*(1-n)+n)))]}function g(t,e,o){e/=100;const n=2*(e*=(o/=100)<.5?o:1-o)/(o+e)*100,i=100*(o+e);return [t,isNaN(n)?0:n,i]}function _(t){return b(...t.match(/.{2}/g).map((t=>parseInt(t,16))))}function w(t){t=t.match(/^[a-zA-Z]+$/)?function(t){if("black"===t.toLowerCase())return "#000";const e=document.createElement("canvas").getContext("2d");return e.fillStyle=t,"#000"===e.fillStyle?null:e.fillStyle}(t):t;const e={cmyk:/^cmyk\D+([\d.]+)\D+([\d.]+)\D+([\d.]+)\D+([\d.]+)/i,rgba:/^rgba?\D+([\d.]+)(%?)\D+([\d.]+)(%?)\D+([\d.]+)(%?)\D*?(([\d.]+)(%?)|$)/i,hsla:/^hsla?\D+([\d.]+)\D+([\d.]+)\D+([\d.]+)\D*?(([\d.]+)(%?)|$)/i,hsva:/^hsva?\D+([\d.]+)\D+([\d.]+)\D+([\d.]+)\D*?(([\d.]+)(%?)|$)/i,hexa:/^#?(([\dA-Fa-f]{3,4})|([\dA-Fa-f]{6})|([\dA-Fa-f]{8}))$/i},o=t=>t.map((t=>/^(|\d+)\.\d+|\d+$/.test(t)?Number(t):void 0));let n;t:for(const i in e)if(n=e[i].exec(t))switch(i){case"cmyk":{const[,t,e,s,r]=o(n);if(t>100||e>100||s>100||r>100)break t;return {values:y(t,e,s,r),type:i}}case"rgba":{let[,t,,e,,s,,,r]=o(n);if(t="%"===n[2]?t/100*255:t,e="%"===n[4]?e/100*255:e,s="%"===n[6]?s/100*255:s,r="%"===n[9]?r/100:r,t>255||e>255||s>255||r<0||r>1)break t;return {values:[...b(t,e,s),r],a:r,type:i}}case"hexa":{let[,t]=n;4!==t.length&&3!==t.length||(t=t.split("").map((t=>t+t)).join(""));const e=t.substring(0,6);let o=t.substring(6);return o=o?parseInt(o,16)/255:void 0,{values:[..._(e),o],a:o,type:i}}case"hsla":{let[,t,e,s,,r]=o(n);if(r="%"===n[6]?r/100:r,t>360||e>100||s>100||r<0||r>1)break t;return {values:[...g(t,e,s),r],a:r,type:i}}case"hsva":{let[,t,e,s,,r]=o(n);if(r="%"===n[6]?r/100:r,t>360||e>100||s>100||r<0||r>1)break t;return {values:[t,e,s,r],a:r,type:i}}}return {values:null,type:null}}function A(t=0,e=0,o=0,n=1){const i=(t,e)=>(o=-1)=>e(~o?t.map((t=>Number(t.toFixed(o)))):t),s={h:t,s:e,v:o,a:n,toHSVA(){const t=[s.h,s.s,s.v,s.a];return t.toString=i(t,(t=>`hsva(${t[0]}, ${t[1]}%, ${t[2]}%, ${s.a})`)),t},toHSLA(){const t=[...v(s.h,s.s,s.v),s.a];return t.toString=i(t,(t=>`hsla(${t[0]}, ${t[1]}%, ${t[2]}%, ${s.a})`)),t},toRGBA(){const t=[...f(s.h,s.s,s.v),s.a];return t.toString=i(t,(t=>`rgba(${t[0]}, ${t[1]}, ${t[2]}, ${s.a})`)),t},toCMYK(){const t=function(t,e,o){const n=f(t,e,o),i=n[0]/255,s=n[1]/255,r=n[2]/255,a=u(1-i,1-s,1-r);return [100*(1===a?0:(1-i-a)/(1-a)),100*(1===a?0:(1-s-a)/(1-a)),100*(1===a?0:(1-r-a)/(1-a)),100*a]}(s.h,s.s,s.v);return t.toString=i(t,(t=>`cmyk(${t[0]}%, ${t[1]}%, ${t[2]}%, ${t[3]}%)`)),t},toHEXA(){const t=function(t,e,o){return f(t,e,o).map((t=>m(t).toString(16).padStart(2,"0")))}(s.h,s.s,s.v),e=s.a>=1?"":Number((255*s.a).toFixed(0)).toString(16).toUpperCase().padStart(2,"0");return e&&t.push(e),t.toString=()=>`#${t.join("").toUpperCase()}`,t},clone:()=>A(s.h,s.s,s.v,s.a)};return s}const $=t=>Math.max(Math.min(t,1),0);function C(t){const e={options:Object.assign({lock:null,onchange:()=>0,onstop:()=>0},t),_keyboard(t){const{options:o}=e,{type:n,key:i}=t;if(document.activeElement===o.wrapper){const{lock:o}=e.options,s="ArrowUp"===i,r="ArrowRight"===i,a="ArrowDown"===i,l="ArrowLeft"===i;if("keydown"===n&&(s||r||a||l)){let n=0,i=0;"v"===o?n=s||r?1:-1:"h"===o?n=s||r?-1:1:(i=s?-1:a?1:0,n=l?-1:r?1:0),e.update($(e.cache.x+.01*n),$(e.cache.y+.01*i)),t.preventDefault();}else i.startsWith("Arrow")&&(e.options.onstop(),t.preventDefault());}},_tapstart(t){i(document,["mouseup","touchend","touchcancel"],e._tapstop),i(document,["mousemove","touchmove"],e._tapmove),t.cancelable&&t.preventDefault(),e._tapmove(t);},_tapmove(t){const{options:o,cache:n}=e,{lock:i,element:s,wrapper:r}=o,a=r.getBoundingClientRect();let l=0,c=0;if(t){const e=t&&t.touches&&t.touches[0];l=t?(e||t).clientX:0,c=t?(e||t).clientY:0,l<a.left?l=a.left:l>a.left+a.width&&(l=a.left+a.width),c<a.top?c=a.top:c>a.top+a.height&&(c=a.top+a.height),l-=a.left,c-=a.top;}else n&&(l=n.x*a.width,c=n.y*a.height);"h"!==i&&(s.style.left=`calc(${l/a.width*100}% - ${s.offsetWidth/2}px)`),"v"!==i&&(s.style.top=`calc(${c/a.height*100}% - ${s.offsetHeight/2}px)`),e.cache={x:l/a.width,y:c/a.height};const p=$(l/a.width),u=$(c/a.height);switch(i){case"v":return o.onchange(p);case"h":return o.onchange(u);default:return o.onchange(p,u)}},_tapstop(){e.options.onstop(),s(document,["mouseup","touchend","touchcancel"],e._tapstop),s(document,["mousemove","touchmove"],e._tapmove);},trigger(){e._tapmove();},update(t=0,o=0){const{left:n,top:i,width:s,height:r}=e.options.wrapper.getBoundingClientRect();"h"===e.options.lock&&(o=t),e._tapmove({clientX:n+s*t,clientY:i+r*o});},destroy(){const{options:t,_tapstart:o,_keyboard:n}=e;s(document,["keydown","keyup"],n),s([t.wrapper,t.element],"mousedown",o),s([t.wrapper,t.element],"touchstart",o,{passive:!1});}},{options:o,_tapstart:n,_keyboard:r}=e;return i([o.wrapper,o.element],"mousedown",n),i([o.wrapper,o.element],"touchstart",n,{passive:!1}),i(document,["keydown","keyup"],r),e}function k(t={}){t=Object.assign({onchange:()=>0,className:"",elements:[]},t);const e=i(t.elements,"click",(e=>{t.elements.forEach((o=>o.classList[e.target===o?"add":"remove"](t.className))),t.onchange(e),e.stopPropagation();}));return {destroy:()=>s(...e)}}const S={variantFlipOrder:{start:"sme",middle:"mse",end:"ems"},positionFlipOrder:{top:"tbrl",right:"rltb",bottom:"btrl",left:"lrbt"},position:"bottom",margin:8,padding:0},O=(t,e,o)=>{const n="object"!=typeof t||t instanceof HTMLElement?{reference:t,popper:e,...o}:t;return {update(t=n){const{reference:e,popper:o}=Object.assign(n,t);if(!o||!e)throw new Error("Popper- or reference-element missing.");return ((t,e,o)=>{const{container:n,arrow:i,margin:s,padding:r,position:a,variantFlipOrder:l,positionFlipOrder:c}={container:document.documentElement.getBoundingClientRect(),...S,...o},{left:p,top:u}=e.style;e.style.left="0",e.style.top="0";const h=t.getBoundingClientRect(),d=e.getBoundingClientRect(),m={t:h.top-d.height-s,b:h.bottom+s,r:h.right+s,l:h.left-d.width-s},f={vs:h.left,vm:h.left+h.width/2-d.width/2,ve:h.left+h.width-d.width,hs:h.top,hm:h.bottom-h.height/2-d.height/2,he:h.bottom-d.height},[v,b="middle"]=a.split("-"),y=c[v],g=l[b],{top:_,left:w,bottom:A,right:$}=n;for(const t of y){const o="t"===t||"b"===t;let n=m[t];const[s,a]=o?["top","left"]:["left","top"],[l,c]=o?[d.height,d.width]:[d.width,d.height],[p,u]=o?[A,$]:[$,A],[v,b]=o?[_,w]:[w,_];if(!(n<v||n+l+r>p))for(const p of g){let m=f[(o?"v":"h")+p];if(!(m<b||m+c+r>u)){if(m-=d[a],n-=d[s],e.style[a]=`${m}px`,e.style[s]=`${n}px`,i){const e=o?h.width/2:h.height/2,r=c/2,u=e>r,d=m+{s:u?r:e,m:r,e:u?r:c-e}[p],f=n+{t:l,b:0,r:0,l}[t];i.style[a]=`${d}px`,i.style[s]=`${f}px`;}return t+p}}}return e.style.left=p,e.style.top=u,null})(e,o,n)}}};class E{static utils=o;static version="1.9.1";static I18N_DEFAULTS={"ui:dialog":"color picker dialog","btn:toggle":"toggle color picker dialog","btn:swatch":"color swatch","btn:last-color":"use previous color","btn:save":"Save","btn:cancel":"Cancel","btn:clear":"Clear","aria:btn:save":"save and close","aria:btn:cancel":"cancel and close","aria:btn:clear":"clear and close","aria:input":"color input field","aria:palette":"color selection area","aria:hue":"hue selection slider","aria:opacity":"selection slider"};static DEFAULT_OPTIONS={appClass:null,theme:"classic",useAsButton:!1,padding:8,disabled:!1,comparison:!0,closeOnScroll:!1,outputPrecision:0,lockOpacity:!1,autoReposition:!0,container:"body",components:{interaction:{}},i18n:{},swatches:null,inline:!1,sliders:null,default:"#42445a",defaultRepresentation:null,position:"bottom-middle",adjustableNumbers:!0,showAlways:!1,closeWithKey:"Escape"};_initializingActive=!0;_recalc=!0;_nanopop=null;_root=null;_color=A();_lastColor=A();_swatchColors=[];_setupAnimationFrame=null;_eventListener={init:[],save:[],hide:[],show:[],clear:[],change:[],changestop:[],cancel:[],swatchselect:[]};constructor(t){this.options=t=Object.assign({...E.DEFAULT_OPTIONS},t);const{swatches:e,components:o,theme:n,sliders:i,lockOpacity:s,padding:r}=t;["nano","monolith"].includes(n)&&!i&&(t.sliders="h"),o.interaction||(o.interaction={});const{preview:a,opacity:l,hue:c,palette:p}=o;o.opacity=!s&&l,o.palette=p||a||l||c,this._preBuild(),this._buildComponents(),this._bindEvents(),this._finalBuild(),e&&e.length&&e.forEach((t=>this.addSwatch(t)));const{button:u,app:h}=this._root;this._nanopop=O(u,h,{margin:r}),u.setAttribute("role","button"),u.setAttribute("aria-label",this._t("btn:toggle"));const d=this;this._setupAnimationFrame=requestAnimationFrame((function e(){if(!h.offsetWidth)return requestAnimationFrame(e);d.setColor(t.default),d._rePositioningPicker(),t.defaultRepresentation&&(d._representation=t.defaultRepresentation,d.setColorRepresentation(d._representation)),t.showAlways&&d.show(),d._initializingActive=!1,d._emit("init");}));}static create=t=>new E(t);_preBuild(){const{options:t}=this;for(const e of ["el","container"])t[e]=c(t[e]);this._root=(t=>{const{components:e,useAsButton:o,inline:n,appClass:i,theme:s,lockOpacity:r}=t.options,l=t=>t?"":'style="display:none" hidden',c=e=>t._t(e),p=a(`\n      <div :ref="root" class="pickr">\n\n        ${o?"":'<button type="button" :ref="button" class="pcr-button"></button>'}\n\n        <div :ref="app" class="pcr-app ${i||""}" data-theme="${s}" ${n?'style="position: unset"':""} aria-label="${c("ui:dialog")}" role="window">\n          <div class="pcr-selection" ${l(e.palette)}>\n            <div :obj="preview" class="pcr-color-preview" ${l(e.preview)}>\n              <button type="button" :ref="lastColor" class="pcr-last-color" aria-label="${c("btn:last-color")}"></button>\n              <div :ref="currentColor" class="pcr-current-color"></div>\n            </div>\n\n            <div :obj="palette" class="pcr-color-palette">\n              <div :ref="picker" class="pcr-picker"></div>\n              <div :ref="palette" class="pcr-palette" tabindex="0" aria-label="${c("aria:palette")}" role="listbox"></div>\n            </div>\n\n            <div :obj="hue" class="pcr-color-chooser" ${l(e.hue)}>\n              <div :ref="picker" class="pcr-picker"></div>\n              <div :ref="slider" class="pcr-hue pcr-slider" tabindex="0" aria-label="${c("aria:hue")}" role="slider"></div>\n            </div>\n\n            <div :obj="opacity" class="pcr-color-opacity" ${l(e.opacity)}>\n              <div :ref="picker" class="pcr-picker"></div>\n              <div :ref="slider" class="pcr-opacity pcr-slider" tabindex="0" aria-label="${c("aria:opacity")}" role="slider"></div>\n            </div>\n          </div>\n\n          <div class="pcr-swatches ${e.palette?"":"pcr-last"}" :ref="swatches"></div>\n\n          <div :obj="interaction" class="pcr-interaction" ${l(Object.keys(e.interaction).length)}>\n            <input :ref="result" class="pcr-result" type="text" spellcheck="false" ${l(e.interaction.input)} aria-label="${c("aria:input")}">\n\n            <input :arr="options" class="pcr-type" data-type="HEXA" value="${r?"HEX":"HEXA"}" type="button" ${l(e.interaction.hex)}>\n            <input :arr="options" class="pcr-type" data-type="RGBA" value="${r?"RGB":"RGBA"}" type="button" ${l(e.interaction.rgba)}>\n            <input :arr="options" class="pcr-type" data-type="HSLA" value="${r?"HSL":"HSLA"}" type="button" ${l(e.interaction.hsla)}>\n            <input :arr="options" class="pcr-type" data-type="HSVA" value="${r?"HSV":"HSVA"}" type="button" ${l(e.interaction.hsva)}>\n            <input :arr="options" class="pcr-type" data-type="CMYK" value="CMYK" type="button" ${l(e.interaction.cmyk)}>\n\n            <input :ref="save" class="pcr-save" value="${c("btn:save")}" type="button" ${l(e.interaction.save)} aria-label="${c("aria:btn:save")}">\n            <input :ref="cancel" class="pcr-cancel" value="${c("btn:cancel")}" type="button" ${l(e.interaction.cancel)} aria-label="${c("aria:btn:cancel")}">\n            <input :ref="clear" class="pcr-clear" value="${c("btn:clear")}" type="button" ${l(e.interaction.clear)} aria-label="${c("aria:btn:clear")}">\n          </div>\n        </div>\n      </div>\n    `),u=p.interaction;return u.options.find((t=>!t.hidden&&!t.classList.add("active"))),u.type=()=>u.options.find((t=>t.classList.contains("active"))),p})(this),t.useAsButton&&(this._root.button=t.el),t.container.appendChild(this._root.root);}_finalBuild(){const t=this.options,e=this._root;if(t.container.removeChild(e.root),t.inline){const o=t.el.parentElement;t.el.nextSibling?o.insertBefore(e.app,t.el.nextSibling):o.appendChild(e.app);}else t.container.appendChild(e.app);t.useAsButton?t.inline&&t.el.remove():t.el.parentNode.replaceChild(e.root,t.el),t.disabled&&this.disable(),t.comparison||(e.button.style.transition="none",t.useAsButton||(e.preview.lastColor.style.transition="none")),this.hide();}_buildComponents(){const t=this,e=this.options.components,o=(t.options.sliders||"v").repeat(2),[n,i]=o.match(/^[vh]+$/g)?o:[],s=()=>this._color||(this._color=this._lastColor.clone()),r={palette:C({element:t._root.palette.picker,wrapper:t._root.palette.palette,onstop:()=>t._emit("changestop","slider",t),onchange(o,n){if(!e.palette)return;const i=s(),{_root:r,options:a}=t,{lastColor:l,currentColor:c}=r.preview;t._recalc&&(i.s=100*o,i.v=100-100*n,i.v<0&&(i.v=0),t._updateOutput("slider"));const p=i.toRGBA().toString(0);this.element.style.background=p,this.wrapper.style.background=`\n                        linear-gradient(to top, rgba(0, 0, 0, ${i.a}), transparent),\n                        linear-gradient(to left, hsla(${i.h}, 100%, 50%, ${i.a}), rgba(255, 255, 255, ${i.a}))\n                    `,a.comparison?a.useAsButton||t._lastColor||l.style.setProperty("--pcr-color",p):(r.button.style.setProperty("--pcr-color",p),r.button.classList.remove("clear"));const u=i.toHEXA().toString();for(const{el:e,color:o}of t._swatchColors)e.classList[u===o.toHEXA().toString()?"add":"remove"]("pcr-active");c.style.setProperty("--pcr-color",p);}}),hue:C({lock:"v"===i?"h":"v",element:t._root.hue.picker,wrapper:t._root.hue.slider,onstop:()=>t._emit("changestop","slider",t),onchange(o){if(!e.hue||!e.palette)return;const n=s();t._recalc&&(n.h=360*o),this.element.style.backgroundColor=`hsl(${n.h}, 100%, 50%)`,r.palette.trigger();}}),opacity:C({lock:"v"===n?"h":"v",element:t._root.opacity.picker,wrapper:t._root.opacity.slider,onstop:()=>t._emit("changestop","slider",t),onchange(o){if(!e.opacity||!e.palette)return;const n=s();t._recalc&&(n.a=Math.round(100*o)/100),this.element.style.background=`rgba(0, 0, 0, ${n.a})`,r.palette.trigger();}}),selectable:k({elements:t._root.interaction.options,className:"active",onchange(e){t._representation=e.target.getAttribute("data-type").toUpperCase(),t._recalc&&t._updateOutput("swatch");}})};this._components=r;}_bindEvents(){const{_root:t,options:e}=this,o=[i(t.interaction.clear,"click",(()=>this._clearColor())),i([t.interaction.cancel,t.preview.lastColor],"click",(()=>{this.setHSVA(...(this._lastColor||this._color).toHSVA(),!0),this._emit("cancel");})),i(t.interaction.save,"click",(()=>{!this.applyColor()&&!e.showAlways&&this.hide();})),i(t.interaction.result,["keyup","input"],(t=>{this.setColor(t.target.value,!0)&&!this._initializingActive&&(this._emit("change",this._color,"input",this),this._emit("changestop","input",this)),t.stopImmediatePropagation();})),i(t.interaction.result,["focus","blur"],(t=>{this._recalc="blur"===t.type,this._recalc&&this._updateOutput(null);})),i([t.palette.palette,t.palette.picker,t.hue.slider,t.hue.picker,t.opacity.slider,t.opacity.picker],["mousedown","touchstart"],(()=>this._recalc=!0),{passive:!0})];if(!e.showAlways){const n=e.closeWithKey;o.push(i(t.button,"click",(()=>this.isOpen()?this.hide():this.show())),i(document,"keyup",(t=>this.isOpen()&&(t.key===n||t.code===n)&&this.hide())),i(document,["touchstart","mousedown"],(e=>{this.isOpen()&&!l(e).some((e=>e===t.app||e===t.button))&&this.hide();}),{capture:!0}));}if(e.adjustableNumbers){const e={rgba:[255,255,255,1],hsva:[360,100,100,1],hsla:[360,100,100,1],cmyk:[100,100,100,100]};p(t.interaction.result,((t,o,n)=>{const i=e[this.getColorRepresentation().toLowerCase()];if(i){const e=i[n],s=t+(e>=100?1e3*o:o);return s<=0?0:Number((s<e?s:e).toPrecision(3))}return t}));}if(e.autoReposition&&!e.inline){let t=null;const n=this;o.push(i(window,["scroll","resize"],(()=>{n.isOpen()&&(e.closeOnScroll&&n.hide(),null===t?(t=setTimeout((()=>t=null),100),requestAnimationFrame((function e(){n._rePositioningPicker(),null!==t&&requestAnimationFrame(e);}))):(clearTimeout(t),t=setTimeout((()=>t=null),100)));}),{capture:!0}));}this._eventBindings=o;}_rePositioningPicker(){const{options:t}=this;if(!t.inline){if(!this._nanopop.update({container:document.body.getBoundingClientRect(),position:t.position})){const t=this._root.app,e=t.getBoundingClientRect();t.style.top=(window.innerHeight-e.height)/2+"px",t.style.left=(window.innerWidth-e.width)/2+"px";}}}_updateOutput(t){const{_root:e,_color:o,options:n}=this;if(e.interaction.type()){const t=`to${e.interaction.type().getAttribute("data-type")}`;e.interaction.result.value="function"==typeof o[t]?o[t]().toString(n.outputPrecision):"";}!this._initializingActive&&this._recalc&&this._emit("change",o,t,this);}_clearColor(t=!1){const{_root:e,options:o}=this;o.useAsButton||e.button.style.setProperty("--pcr-color","rgba(0, 0, 0, 0.15)"),e.button.classList.add("clear"),o.showAlways||this.hide(),this._lastColor=null,this._initializingActive||t||(this._emit("save",null),this._emit("clear"));}_parseLocalColor(t){const{values:e,type:o,a:n}=w(t),{lockOpacity:i}=this.options,s=void 0!==n&&1!==n;return e&&3===e.length&&(e[3]=void 0),{values:!e||i&&s?null:e,type:o}}_t(t){return this.options.i18n[t]||E.I18N_DEFAULTS[t]}_emit(t,...e){this._eventListener[t].forEach((t=>t(...e,this)));}on(t,e){return this._eventListener[t].push(e),this}off(t,e){const o=this._eventListener[t]||[],n=o.indexOf(e);return ~n&&o.splice(n,1),this}addSwatch(t){const{values:e}=this._parseLocalColor(t);if(e){const{_swatchColors:t,_root:o}=this,n=A(...e),s=r(`<button type="button" style="--pcr-color: ${n.toRGBA().toString(0)}" aria-label="${this._t("btn:swatch")}"/>`);return o.swatches.appendChild(s),t.push({el:s,color:n}),this._eventBindings.push(i(s,"click",(()=>{this.setHSVA(...n.toHSVA(),!0),this._emit("swatchselect",n),this._emit("change",n,"swatch",this);}))),!0}return !1}removeSwatch(t){const e=this._swatchColors[t];if(e){const{el:o}=e;return this._root.swatches.removeChild(o),this._swatchColors.splice(t,1),!0}return !1}applyColor(t=!1){const{preview:e,button:o}=this._root,n=this._color.toRGBA().toString(0);return e.lastColor.style.setProperty("--pcr-color",n),this.options.useAsButton||o.style.setProperty("--pcr-color",n),o.classList.remove("clear"),this._lastColor=this._color.clone(),this._initializingActive||t||this._emit("save",this._color),this}destroy(){cancelAnimationFrame(this._setupAnimationFrame),this._eventBindings.forEach((t=>s(...t))),Object.keys(this._components).forEach((t=>this._components[t].destroy()));}destroyAndRemove(){this.destroy();const{root:t,app:e}=this._root;t.parentElement&&t.parentElement.removeChild(t),e.parentElement.removeChild(e),Object.keys(this).forEach((t=>this[t]=null));}hide(){return !!this.isOpen()&&(this._root.app.classList.remove("visible"),this._emit("hide"),!0)}show(){return !this.options.disabled&&!this.isOpen()&&(this._root.app.classList.add("visible"),this._rePositioningPicker(),this._emit("show",this._color),this)}isOpen(){return this._root.app.classList.contains("visible")}setHSVA(t=360,e=0,o=0,n=1,i=!1){const s=this._recalc;if(this._recalc=!1,t<0||t>360||e<0||e>100||o<0||o>100||n<0||n>1)return !1;this._color=A(t,e,o,n);const{hue:r,opacity:a,palette:l}=this._components;return r.update(t/360),a.update(n),l.update(e/100,1-o/100),i||this.applyColor(),s&&this._updateOutput(),this._recalc=s,!0}setColor(t,e=!1){if(null===t)return this._clearColor(e),!0;const{values:o,type:n}=this._parseLocalColor(t);if(o){const t=n.toUpperCase(),{options:i}=this._root.interaction,s=i.find((e=>e.getAttribute("data-type")===t));if(s&&!s.hidden)for(const t of i)t.classList[t===s?"add":"remove"]("active");return !!this.setHSVA(...o,e)&&this.setColorRepresentation(t)}return !1}setColorRepresentation(t){return t=t.toUpperCase(),!!this._root.interaction.options.find((e=>e.getAttribute("data-type").startsWith(t)&&!e.click()))}getColorRepresentation(){return this._representation}getColor(){return this._color}getSelectedColor(){return this._lastColor}getRoot(){return this._root}disable(){return this.hide(),this.options.disabled=!0,this._root.button.classList.add("disabled"),this}enable(){return this.options.disabled=!1,this._root.button.classList.remove("disabled"),this}}return e=e.default})()));

});

var Pickr = /*@__PURE__*/getDefaultExportFromCjs(pickr_min);

const DEFAULT_SETTINGS = {
    viewMode: ViewMode.Normal,
    viewImageInEditor: true,
    viewImageInCPB: true,
    viewImageWithLink: true,
    viewImageOther: true,
    // pinMode: false,
    pinMaximum: 3,
    pinCoverMode: true,
    imageMoveSpeed: 10,
    imgTipToggle: true,
    imgFullScreenMode: IMG_FULL_SCREEN_MODE.FIT,
    imgViewBackgroundColor: IMG_DEFAULT_BACKGROUND_COLOR,
    imageBorderToggle: false,
    imageBorderWidth: IMG_BORDER_WIDTH.MEDIUM,
    imageBorderStyle: IMG_BORDER_STYLE.SOLID,
    imageBorderColor: IMG_BORDER_COLOR.RED,
    galleryNavbarToggle: true,
    galleryNavbarDefaultColor: GALLERY_NAVBAR_DEFAULT_COLOR,
    galleryNavbarHoverColor: GALLERY_NAVBAR_HOVER_COLOR,
    galleryImgBorderActive: true,
    galleryImgBorderActiveColor: GALLERY_IMG_BORDER_ACTIVE_COLOR,
    // hotkeys conf
    moveTheImageHotkey: MOVE_THE_IMAGE.DEFAULT_HOTKEY,
    switchTheImageHotkey: SWITCH_THE_IMAGE.DEFAULT_HOTKEY,
    doubleClickToolbar: TOOLBAR_CONF[3].class,
    viewTriggerHotkey: MODIFIER_HOTKEYS.NONE
};
class ImageToolkitSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        let { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: t("IMAGE_TOOLKIT_SETTINGS_TITLE") });
        // Common Settings:
        this.displayCommonSettings(containerEl);
        // View Trigger Settings:
        this.displayViewTriggerSettings(containerEl);
        // Pin Mode Settings:
        this.displayPinModeSettings(containerEl);
        //region >>> VIEW_DETAILS_SETTINGS
        containerEl.createEl('h3', { text: t("VIEW_DETAILS_SETTINGS") });
        let imgMoveSpeedScaleText;
        new obsidian.Setting(containerEl)
            .setName(t("IMAGE_MOVE_SPEED_NAME"))
            .setDesc(t("IMAGE_MOVE_SPEED_DESC"))
            .addSlider(slider => slider
            .setLimits(1, 30, 1)
            .setValue(this.plugin.settings.imageMoveSpeed)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            imgMoveSpeedScaleText.innerText = " " + value.toString();
            this.plugin.settings.imageMoveSpeed = value;
            this.plugin.saveSettings();
        })))
            .settingEl.createDiv('', (el) => {
            imgMoveSpeedScaleText = el;
            el.style.minWidth = "2.3em";
            el.style.textAlign = "right";
            el.innerText = " " + this.plugin.settings.imageMoveSpeed.toString();
        });
        new obsidian.Setting(containerEl)
            .setName(t("IMAGE_TIP_TOGGLE_NAME"))
            .setDesc(t("IMAGE_TIP_TOGGLE_DESC"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.imgTipToggle)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.imgTipToggle = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName(t("IMG_FULL_SCREEN_MODE_NAME"))
            .addDropdown((dropdown) => __awaiter(this, void 0, void 0, function* () {
            for (const key in IMG_FULL_SCREEN_MODE) {
                // @ts-ignore
                dropdown.addOption(key, t(key));
            }
            dropdown.setValue(this.plugin.settings.imgFullScreenMode);
            dropdown.onChange((option) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.imgFullScreenMode = option;
                yield this.plugin.saveSettings();
            }));
        }));
        this.createPickrSetting(containerEl, 'IMG_VIEW_BACKGROUND_COLOR_NAME', IMG_DEFAULT_BACKGROUND_COLOR);
        //endregion
        //region >>> IMAGE_BORDER_SETTINGS
        containerEl.createEl('h3', { text: t("IMAGE_BORDER_SETTINGS") });
        new obsidian.Setting(containerEl)
            .setName(t("IMAGE_BORDER_TOGGLE_NAME"))
            .setDesc(t("IMAGE_BORDER_TOGGLE_DESC"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.imageBorderToggle)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.imageBorderToggle = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName(t("IMAGE_BORDER_WIDTH_NAME"))
            .addDropdown((dropdown) => __awaiter(this, void 0, void 0, function* () {
            for (const key in IMG_BORDER_WIDTH) {
                // @ts-ignore
                dropdown.addOption(IMG_BORDER_WIDTH[key], t(key));
            }
            dropdown.setValue(this.plugin.settings.imageBorderWidth);
            dropdown.onChange((option) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.imageBorderWidth = option;
                yield this.plugin.saveSettings();
            }));
        }));
        new obsidian.Setting(containerEl)
            .setName(t("IMAGE_BORDER_STYLE_NAME"))
            .addDropdown((dropdown) => __awaiter(this, void 0, void 0, function* () {
            for (const key in IMG_BORDER_STYLE) {
                // @ts-ignore
                dropdown.addOption(IMG_BORDER_STYLE[key], t(key));
            }
            dropdown.setValue(this.plugin.settings.imageBorderStyle);
            dropdown.onChange((option) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.imageBorderStyle = option;
                yield this.plugin.saveSettings();
            }));
        }));
        new obsidian.Setting(containerEl)
            .setName(t("IMAGE_BORDER_COLOR_NAME"))
            .addDropdown((dropdown) => __awaiter(this, void 0, void 0, function* () {
            for (const key in IMG_BORDER_COLOR) {
                // @ts-ignore
                dropdown.addOption(IMG_BORDER_COLOR[key], t(key));
            }
            dropdown.setValue(this.plugin.settings.imageBorderColor);
            dropdown.onChange((option) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.imageBorderColor = option;
                yield this.plugin.saveSettings();
            }));
        }));
        //endregion
        //region >>> GALLERY_NAVBAR_SETTINGS
        let galleryNavbarDefaultColorSetting, galleryNavbarHoverColorSetting, galleryImgBorderToggleSetting, galleryImgBorderActiveColorSetting;
        containerEl.createEl('h3', { text: t("GALLERY_NAVBAR_SETTINGS") });
        new obsidian.Setting(containerEl)
            .setName(t("GALLERY_NAVBAR_TOGGLE_NAME"))
            .setDesc(t("GALLERY_NAVBAR_TOGGLE_DESC"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.galleryNavbarToggle)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.galleryNavbarToggle = value;
            this.switchSettingsDisabled(!value, galleryNavbarDefaultColorSetting, galleryNavbarHoverColorSetting, galleryImgBorderToggleSetting, galleryImgBorderActiveColorSetting);
            yield this.plugin.saveSettings();
        })));
        galleryNavbarDefaultColorSetting = this.createPickrSetting(containerEl, 'GALLERY_NAVBAR_DEFAULT_COLOR_NAME', GALLERY_NAVBAR_DEFAULT_COLOR);
        galleryNavbarHoverColorSetting = this.createPickrSetting(containerEl, 'GALLERY_NAVBAR_HOVER_COLOR_NAME', GALLERY_NAVBAR_HOVER_COLOR);
        galleryImgBorderToggleSetting = new obsidian.Setting(containerEl)
            .setName(t("GALLERY_IMG_BORDER_TOGGLE_NAME"))
            .setDesc(t("GALLERY_IMG_BORDER_TOGGLE_DESC"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.galleryImgBorderActive)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.galleryImgBorderActive = value;
            yield this.plugin.saveSettings();
        })));
        galleryImgBorderActiveColorSetting = this.createPickrSetting(containerEl, 'GALLERY_IMG_BORDER_ACTIVE_COLOR_NAME', GALLERY_IMG_BORDER_ACTIVE_COLOR);
        this.switchSettingsDisabled(!this.plugin.settings.galleryNavbarToggle, galleryNavbarDefaultColorSetting, galleryNavbarHoverColorSetting, galleryImgBorderToggleSetting, galleryImgBorderActiveColorSetting);
        //endregion
        //region >>> HOTKEYS_SETTINGS
        containerEl.createEl('h3', { text: t("HOTKEY_SETTINGS") });
        containerEl.createEl('p', { text: t("HOTKEY_SETTINGS_DESC") });
        if (this.plugin.settings.moveTheImageHotkey === this.plugin.settings.switchTheImageHotkey) {
            this.plugin.settings.moveTheImageHotkey = MOVE_THE_IMAGE.DEFAULT_HOTKEY;
        }
        const moveTheImageSetting = new obsidian.Setting(containerEl)
            .setName(t("MOVE_THE_IMAGE_NAME"))
            .setDesc(t("MOVE_THE_IMAGE_DESC"))
            .addDropdown((dropdown) => __awaiter(this, void 0, void 0, function* () {
            dropdown.addOptions(this.getDropdownOptions());
            dropdown.setValue(this.plugin.settings.moveTheImageHotkey);
            dropdown.onChange((option) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.moveTheImageHotkey = option;
                this.checkDropdownOptions(MOVE_THE_IMAGE.CODE, switchTheImageSetting);
                yield this.plugin.saveSettings();
            }));
        })).then((setting) => {
            setting.controlEl.appendChild(createDiv('setting-editor-extra-setting-button hotkeys-settings-plus', (el) => {
                el.innerHTML = "+";
            }));
            setting.controlEl.appendChild(createDiv('setting-editor-extra-setting-button', (el) => {
                el.innerHTML = MOVE_THE_IMAGE.SVG;
            }));
        });
        if (this.plugin.settings.switchTheImageHotkey === this.plugin.settings.moveTheImageHotkey) {
            this.plugin.settings.switchTheImageHotkey = SWITCH_THE_IMAGE.DEFAULT_HOTKEY;
        }
        const switchTheImageSetting = new obsidian.Setting(containerEl)
            .setName(t("SWITCH_THE_IMAGE_NAME"))
            .setDesc(t("SWITCH_THE_IMAGE_DESC"))
            .addDropdown((dropdown) => __awaiter(this, void 0, void 0, function* () {
            dropdown.addOptions(this.getDropdownOptions());
            dropdown.setValue(this.plugin.settings.switchTheImageHotkey);
            dropdown.onChange((option) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.switchTheImageHotkey = option;
                this.checkDropdownOptions(SWITCH_THE_IMAGE.CODE, moveTheImageSetting);
                yield this.plugin.saveSettings();
            }));
        })).then((setting) => {
            setting.controlEl.appendChild(createDiv('setting-editor-extra-setting-button hotkeys-settings-plus', (el) => {
                el.innerHTML = "+";
            }));
            setting.controlEl.appendChild(createDiv('setting-editor-extra-setting-button', (el) => {
                el.innerHTML = SWITCH_THE_IMAGE.SVG;
            }));
        });
        if (switchTheImageSetting) {
            this.checkDropdownOptions(MOVE_THE_IMAGE.CODE, switchTheImageSetting);
        }
        if (moveTheImageSetting) {
            this.checkDropdownOptions(SWITCH_THE_IMAGE.CODE, moveTheImageSetting);
        }
        new obsidian.Setting(containerEl)
            .setName(t("DOUBLE_CLICK_TOOLBAR_NAME"))
            .addDropdown((dropdown) => __awaiter(this, void 0, void 0, function* () {
            for (const conf of TOOLBAR_CONF) {
                if (!conf.enableHotKey)
                    continue;
                // @ts-ignore
                dropdown.addOption(conf.class, t(conf.title));
            }
            dropdown.setValue(this.plugin.settings.doubleClickToolbar);
            dropdown.onChange((option) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.doubleClickToolbar = option;
                yield this.plugin.saveSettings();
            }));
        }));
        new obsidian.Setting(containerEl)
            .setName(t("VIEW_TRIGGER_HOTKEY_NAME"))
            .setDesc(t("VIEW_TRIGGER_HOTKEY_DESC"))
            .addDropdown((dropdown) => __awaiter(this, void 0, void 0, function* () {
            dropdown.addOptions(this.getDropdownOptions());
            dropdown.setValue(this.plugin.settings.viewTriggerHotkey);
            dropdown.onChange((option) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.viewTriggerHotkey = option;
                yield this.plugin.saveSettings();
            }));
        }));
        //endregion
    }
    displayCommonSettings(containerEl) {
        containerEl.createEl('h3', { text: t('COMMON_SETTINGS') });
        new obsidian.Setting(containerEl)
            .setName(t("VIEW_MODE_NAME"))
            .addDropdown((dropdown) => __awaiter(this, void 0, void 0, function* () {
            for (const key in ViewMode) {
                // @ts-ignore
                dropdown.addOption(key, t('VIEW_MODE_' + key.toUpperCase()));
            }
            dropdown.setValue(this.plugin.settings.viewMode);
            dropdown.onChange((option) => __awaiter(this, void 0, void 0, function* () {
                yield this.plugin.switchViewMode(option);
            }));
        }));
    }
    displayViewTriggerSettings(containerEl) {
        containerEl.createEl('h3', { text: t("VIEW_TRIGGER_SETTINGS") });
        new obsidian.Setting(containerEl)
            .setName(t("VIEW_IMAGE_IN_EDITOR_NAME"))
            .setDesc(t("VIEW_IMAGE_IN_EDITOR_DESC"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.viewImageInEditor)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.viewImageInEditor = value;
            this.plugin.refreshViewTrigger();
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName(t("VIEW_IMAGE_IN_CPB_NAME"))
            .setDesc(t("VIEW_IMAGE_IN_CPB_DESC"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.viewImageInCPB)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.viewImageInCPB = value;
            this.plugin.refreshViewTrigger();
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName(t("VIEW_IMAGE_WITH_A_LINK_NAME"))
            .setDesc(t("VIEW_IMAGE_WITH_A_LINK_DESC"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.viewImageWithLink)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.viewImageWithLink = value;
            this.plugin.refreshViewTrigger();
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName(t("VIEW_IMAGE_OTHER_NAME"))
            .setDesc(t("VIEW_IMAGE_OTHER_DESC"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.viewImageOther)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.viewImageOther = value;
            this.plugin.refreshViewTrigger();
            yield this.plugin.saveSettings();
        })));
    }
    displayPinModeSettings(containerEl) {
        //region >>> PIN_MODE_SETTINGS
        let pinMaximumSetting;
        containerEl.createEl('h3', { text: t("PIN_MODE_SETTINGS") });
        /*new Setting(containerEl)
          .setName(t("PIN_MODE_NAME"))
          .setDesc(t("PIN_MODE_DESC"))
          .addToggle(toggle => toggle
            .setValue(this.plugin.settings.pinMode)
            .onChange(async (value) => {
              this.plugin.settings.pinMode = value;
              this.switchSettingsDisabled(!value, pinMaximumSetting, pinCoverSetting);
              //this.plugin.togglePinMode(value);
              await this.plugin.saveSettings();
            }));*/
        let pinMaximumScaleText;
        pinMaximumSetting = new obsidian.Setting(containerEl)
            .setName(t("PIN_MAXIMUM_NAME"))
            .addSlider(slider => slider
            .setLimits(1, 5, 1)
            .setValue(this.plugin.settings.pinMaximum)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            pinMaximumScaleText.innerText = " " + value.toString();
            this.plugin.settings.pinMaximum = value;
            // this.plugin.containerView?.setPinMaximum(value);
            this.plugin.saveSettings();
        })));
        pinMaximumSetting.settingEl.createDiv('', (el) => {
            pinMaximumScaleText = el;
            el.style.minWidth = "2.3em";
            el.style.textAlign = "right";
            el.innerText = " " + this.plugin.settings.pinMaximum.toString();
        });
        new obsidian.Setting(containerEl)
            .setName(t("PIN_COVER_NAME"))
            .setDesc(t("PIN_COVER_DESC"))
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.pinCoverMode)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.pinCoverMode = value;
            yield this.plugin.saveSettings();
        })));
        //this.switchSettingsDisabled(!this.plugin.settings.pinMode, pinMaximumSetting, pinCoverSetting);
        //endregion
    }
    switchSettingsDisabled(disabled, ...settings) {
        for (const setting of settings) {
            setting === null || setting === void 0 ? void 0 : setting.setDisabled(disabled);
        }
    }
    createPickrSetting(containerEl, name, defaultColor) {
        let pickrDefault;
        if ('GALLERY_NAVBAR_DEFAULT_COLOR_NAME' === name) {
            pickrDefault = this.plugin.settings.galleryNavbarDefaultColor;
        }
        else if ('GALLERY_NAVBAR_HOVER_COLOR_NAME' === name) {
            pickrDefault = this.plugin.settings.galleryNavbarHoverColor;
        }
        else if ('GALLERY_IMG_BORDER_ACTIVE_COLOR_NAME' === name) {
            pickrDefault = this.plugin.settings.galleryImgBorderActiveColor;
        }
        else if ('IMG_VIEW_BACKGROUND_COLOR_NAME' === name) {
            pickrDefault = this.plugin.settings.imgViewBackgroundColor;
        }
        else {
            pickrDefault = defaultColor;
        }
        let pickr;
        return new obsidian.Setting(containerEl)
            // @ts-ignore
            .setName(t(name))
            .then((setting) => {
            pickr = Pickr.create({
                el: setting.controlEl.createDiv({ cls: "picker" }),
                theme: 'nano',
                position: "left-middle",
                lockOpacity: false,
                default: pickrDefault,
                swatches: [],
                components: {
                    preview: true,
                    hue: true,
                    opacity: true,
                    interaction: {
                        hex: true,
                        rgba: true,
                        hsla: false,
                        input: true,
                        cancel: true,
                        save: true,
                    },
                }
            })
                .on('show', (color, instance) => {
                if (!this.plugin.settings.galleryNavbarToggle)
                    pickr === null || pickr === void 0 ? void 0 : pickr.hide();
                const { result } = pickr.getRoot().interaction;
                requestAnimationFrame(() => requestAnimationFrame(() => result.select()));
            })
                .on('save', (color, instance) => {
                if (!color)
                    return;
                instance.hide();
                const savedColor = color.toHEXA().toString();
                instance.addSwatch(savedColor);
                this.setAndSavePickrSetting(name, savedColor);
            })
                .on('cancel', (instance) => {
                instance.hide();
            });
        })
            .addExtraButton((btn) => {
            btn.setIcon("reset")
                .onClick(() => {
                pickr.setColor(defaultColor);
                this.setAndSavePickrSetting(name, defaultColor);
            })
                .setTooltip('restore default color');
        });
    }
    setAndSavePickrSetting(name, savedColor) {
        if ('GALLERY_NAVBAR_DEFAULT_COLOR_NAME' === name) {
            this.plugin.settings.galleryNavbarDefaultColor = savedColor;
        }
        else if ('GALLERY_NAVBAR_HOVER_COLOR_NAME' === name) {
            this.plugin.settings.galleryNavbarHoverColor = savedColor;
        }
        else if ('GALLERY_IMG_BORDER_ACTIVE_COLOR_NAME' === name) {
            this.plugin.settings.galleryImgBorderActiveColor = savedColor;
        }
        else if ('IMG_VIEW_BACKGROUND_COLOR_NAME' === name) {
            this.plugin.settings.imgViewBackgroundColor = savedColor;
            // this.plugin.containerView?.setImgViewDefaultBackgroundForImgList();
            this.plugin.getAllContainerViews().forEach(container => {
                container.setImgViewDefaultBackgroundForImgList();
            });
        }
        this.plugin.saveSettings();
    }
    getDropdownOptions() {
        let options = {};
        for (const key in MODIFIER_HOTKEYS) {
            //@ts-ignore
            options[key] = t(key);
        }
        return options;
    }
    checkDropdownOptions(code, setting) {
        if (!setting || !setting.controlEl)
            return;
        const optionElList = setting.controlEl.getElementsByClassName('dropdown')[0].getElementsByTagName('option');
        for (let i = 0, size = optionElList.length; i < size; i++) {
            if (code === MOVE_THE_IMAGE.CODE) {
                optionElList[i].disabled = optionElList[i].value === this.plugin.settings.moveTheImageHotkey;
            }
            else if (code === SWITCH_THE_IMAGE.CODE) {
                optionElList[i].disabled = optionElList[i].value === this.plugin.settings.switchTheImageHotkey;
            }
        }
    }
}

/**
 * ts class object: image operating status
 */
class ImgStatusCto {
    constructor() {
        // true: the popup layer of viewing image is displayed
        this.popup = false;
        // whether the image is being dragged
        this.dragging = false;
        // keybord pressing status
        this.arrowUp = false;
        this.arrowDown = false;
        this.arrowLeft = false;
        this.arrowRight = false;
        this.fullScreen = false;
        this.activeImgZIndex = 0; /*--layer-status-bar*/
        this.clickCount = 0;
    }
}
/**
 * ts class object: image information including all html elements
 */
class ImgInfoCto {
    constructor() {
        this.imgList = new Array();
        this.getPopupImgNum = () => {
            let num = 0;
            for (const imgCto of this.imgList) {
                if (imgCto.popup)
                    num++;
            }
            return num;
        };
    }
}
class ImgCto {
    constructor(index, mtime, imgViewEl) {
        this.popup = false;
        this.zIndex = 0;
        this.curWidth = 0; // image's current width
        this.curHeight = 0;
        this.realWidth = 0; // image's real width
        this.realHeight = 0;
        this.left = 0; // margin-left
        this.top = 0; // margin-top
        this.moveX = 0; // 鼠标相对于图片的位置
        this.moveY = 0;
        this.rotate = 0; // rotateDeg
        this.invertColor = false;
        this.scaleX = false; // scaleX(-1)
        this.scaleY = false; // scaleY(-1)
        this.fullScreen = false; // whether the image is being previewed in full-screen mode
        this.defaultImgStyle = {
            transform: 'none',
            filter: 'none',
            mixBlendMode: 'normal',
            borderWidth: '',
            borderStyle: '',
            borderColor: ''
        };
        this.index = index;
        this.mtime = mtime;
        this.imgViewEl = imgViewEl;
    }
}

/**
 * Image utility class
 */
class ImgUtil {
    static copyText(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
            //console.log('copyText:', copyText);
        })
            .catch(err => {
            console.error('copy text error', err);
        });
    }
    static copyImage(imgEle, width, height) {
        let image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = imgEle.src;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);
            try {
                canvas.toBlob((blob) => __awaiter(this, void 0, void 0, function* () {
                    yield navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
                        .then(() => {
                        new obsidian.Notice(t("COPY_IMAGE_SUCCESS"));
                    }, () => {
                        new obsidian.Notice(t("COPY_IMAGE_ERROR"));
                    });
                }));
            }
            catch (error) {
                new obsidian.Notice(t("COPY_IMAGE_ERROR"));
                console.error(error);
            }
        };
        image.onerror = () => {
            new obsidian.Notice(t("COPY_IMAGE_ERROR"));
        };
    }
}
ImgUtil.calculateImgZoomSize = (realImg, imgCto, windowWidth, windowHeight) => {
    if (!windowWidth) {
        windowWidth = document.documentElement.clientWidth || document.body.clientWidth;
    }
    if (!windowHeight) {
        windowHeight = (document.documentElement.clientHeight || document.body.clientHeight) - 100;
    }
    const windowZoomWidth = windowWidth * ZOOM_FACTOR;
    const windowZoomHeight = windowHeight * ZOOM_FACTOR;
    let tempWidth = realImg.width, tempHeight = realImg.height;
    if (realImg.height > windowZoomHeight) {
        tempHeight = windowZoomHeight;
        if ((tempWidth = tempHeight / realImg.height * realImg.width) > windowZoomWidth) {
            tempWidth = windowZoomWidth;
        }
    }
    else if (realImg.width > windowZoomWidth) {
        tempWidth = windowZoomWidth;
        tempHeight = tempWidth / realImg.width * realImg.height;
    }
    tempHeight = tempWidth * realImg.height / realImg.width;
    // cache image info: curWidth, curHeight, realWidth, realHeight, left, top
    imgCto.left = (windowWidth - tempWidth) / 2;
    imgCto.top = (windowHeight - tempHeight) / 2;
    imgCto.curWidth = tempWidth;
    imgCto.curHeight = tempHeight;
    imgCto.realWidth = realImg.width;
    imgCto.realHeight = realImg.height;
    /* console.log('calculateImgZoomSize', 'realImg: ' + realImg.width + ',' + realImg.height,
        'tempSize: ' + tempWidth + ',' + tempHeight,
        'windowZoomSize: ' + windowZoomWidth + ',' + windowZoomHeight,
        'windowSize: ' + windowWidth + ',' + windowHeight); */
    return imgCto;
};
/**
 * zoom an image
 * @param ratio
 * @param targetImgInfo
 * @param offsetSize
 * @param actualSize
 * @returns
 */
ImgUtil.zoom = (ratio, targetImgInfo, offsetSize, actualSize) => {
    let zoomRatio;
    if (!actualSize) {
        const zoomInFlag = ratio > 0;
        ratio = zoomInFlag ? 1 + ratio : 1 / (1 - ratio);
        zoomRatio = targetImgInfo.curWidth * ratio / targetImgInfo.realWidth;
    }
    // Snap to 100% zoom when we pass over it
    const curRatio = targetImgInfo.curWidth / targetImgInfo.realWidth;
    if (actualSize || (curRatio < 1 && zoomRatio > 1) || (curRatio > 1 && zoomRatio < 1)) {
        // set zoom ratio to 100%
        zoomRatio = 1;
        // reduce snap offset ratio accordingly
        ratio = 1 / curRatio;
    }
    let newWidth = targetImgInfo.realWidth * zoomRatio;
    let newHeight = targetImgInfo.realHeight * zoomRatio;
    if (IMG_VIEW_MIN >= newWidth || IMG_VIEW_MIN >= newHeight) {
        // set minimum width or height
        if (IMG_VIEW_MIN >= newWidth) {
            newWidth = IMG_VIEW_MIN;
            newHeight = (newWidth * targetImgInfo.realHeight) / targetImgInfo.realWidth;
        }
        else {
            newHeight = IMG_VIEW_MIN;
            newWidth = (newHeight * targetImgInfo.realWidth) / targetImgInfo.realHeight;
        }
        ratio = 1;
    }
    const left = targetImgInfo.left + offsetSize.offsetX * (1 - ratio);
    const top = targetImgInfo.top + offsetSize.offsetY * (1 - ratio);
    // cache image info: curWidth, curHeight, left, top
    targetImgInfo.curWidth = newWidth;
    targetImgInfo.curHeight = newHeight;
    targetImgInfo.left = left;
    targetImgInfo.top = top;
    // return { newWidth, left, top };
    return targetImgInfo;
};
ImgUtil.transform = (targetImgInfo) => {
    let transform = 'rotate(' + targetImgInfo.rotate + 'deg)';
    if (targetImgInfo.scaleX) {
        transform += ' scaleX(-1)';
    }
    if (targetImgInfo.scaleY) {
        transform += ' scaleY(-1)';
    }
    targetImgInfo.imgViewEl.style.setProperty('transform', transform);
};
ImgUtil.rotate = (degree, targetImgInfo) => {
    targetImgInfo.imgViewEl.style.setProperty('transform', 'rotate(' + (targetImgInfo.rotate += degree) + 'deg)');
};
ImgUtil.invertImgColor = (imgEle, open) => {
    if (open) {
        imgEle.style.setProperty('filter', 'invert(1) hue-rotate(180deg)');
        imgEle.style.setProperty('mix-blend-mode', 'screen');
    }
    else {
        imgEle.style.setProperty('filter', 'none');
        imgEle.style.setProperty('mix-blend-mode', 'normal');
    }
    // open ? imgEle.addClass('image-toolkit-img-invert') : imgEle.removeClass('image-toolkit-img-invert');
};

class ContainerView {
    constructor(plugin) {
        this.lastClickedImgDefaultStyle = {
            borderWidth: '',
            borderStyle: '',
            borderColor: ''
        };
        this.imgGlobalStatus = new ImgStatusCto();
        this.imgInfo = new ImgInfoCto();
        this.getViewMode = () => {
            return this.plugin.settings.viewMode;
        };
        this.isPinMode = () => {
            return ViewMode.Pin === this.getViewMode();
        };
        this.isNormalMode = () => {
            return ViewMode.Normal === this.getViewMode();
        };
        this.setMenuView = (menuView) => {
            this.menuView = menuView;
        };
        this.getPlugin = () => {
            return this.plugin;
        };
        this.getLastClickedImgEl = () => {
            return this.lastClickedImgEl;
        };
        this.getActiveImg = () => {
            return this.imgGlobalStatus.activeImg;
        };
        this.getDoc = () => {
            return this.doc;
        };
        /*public setPinMaximum = (val: number) => {
          this.pinMaximum = val;
        }*/
        this.getOitContainerViewEl = () => {
            return this.imgInfo.imgContainerEl;
        };
        this.getParentContainerEl = (targetEl) => {
            if (!targetEl) {
                return this.parentContainerEl;
            }
            if (!this.parentContainerEl) {
                this.parentContainerEl = targetEl.matchParent('body');
                this.doc = this.parentContainerEl.ownerDocument;
            }
            return this.parentContainerEl;
        };
        //region ================== Container View & Init ========================
        /**
         * Render when clicking an image (core step)
         * @param targetEl clicked image's element
         * @returns
         */
        this.renderContainer = (targetEl) => {
            if (!this.checkStatus())
                return;
            const matchedImg = this.initContainerView(targetEl, this.getParentContainerEl(targetEl));
            if (!matchedImg)
                return;
            this.openOitContainerView(matchedImg);
            this.renderGalleryNavbar();
            this.refreshImg(matchedImg, targetEl.src, targetEl.alt);
            matchedImg.mtime = new Date().getTime();
        };
        /**
         * initContainerDom ->
         * @param targetEl
         * @param parentContainerEl  targetEl's body
         */
        this.initContainerView = (targetEl, parentContainerEl) => {
            const matchedImg = this.initContainerDom(parentContainerEl);
            if (!matchedImg)
                return null;
            matchedImg.targetOriginalImgEl = targetEl;
            this.restoreBorderForLastClickedImg();
            this.initDefaultData(matchedImg, window.getComputedStyle(targetEl));
            this.addBorderForLastClickedImg(targetEl);
            this.addOrRemoveEvents(matchedImg, true); // add events
            return matchedImg;
        };
        this.removeOitContainerView = () => {
            var _a;
            this.restoreBorderForLastClickedImg();
            this.removeGalleryNavbar();
            (_a = this.imgInfo.oitContainerEl) === null || _a === void 0 ? void 0 : _a.remove();
            this.imgInfo.oitContainerEl = null;
            this.imgInfo.imgContainerEl = null;
            this.imgGlobalStatus.dragging = false;
            this.imgGlobalStatus.popup = false;
            this.imgGlobalStatus.activeImgZIndex = 0;
            this.imgGlobalStatus.fullScreen = false;
            this.imgGlobalStatus.activeImg = null;
            // clear imgList
            this.imgInfo.imgList.length = 0;
        };
        this.checkStatus = () => {
            const viewMode = this.plugin.getViewMode();
            if (!viewMode)
                return false;
            // none of popped-up-images
            if (!this.imgGlobalStatus.popup)
                return true;
            // Pin mode && Cover mode
            if (this.isPinMode() && this.plugin.settings.pinCoverMode)
                return true;
            // configured max images > current pop-up images
            if (this.getConfiguredPinMaximum() > this.imgInfo.getPopupImgNum())
                return true;
            new obsidian.Notice(t("PIN_MAXIMUM_NOTICE"));
            return false;
        };
        this.getConfiguredPinMaximum = () => {
            if (this.isPinMode())
                return this.plugin.settings.pinMaximum;
            return 1;
        };
        this.initDefaultData = (matchedImg, targetImgStyle) => {
            if (targetImgStyle) {
                matchedImg.defaultImgStyle.transform = 'none';
                matchedImg.defaultImgStyle.filter = targetImgStyle.filter;
                matchedImg.defaultImgStyle.mixBlendMode = targetImgStyle.mixBlendMode;
                matchedImg.defaultImgStyle.borderWidth = targetImgStyle.borderWidth;
                matchedImg.defaultImgStyle.borderStyle = targetImgStyle.borderStyle;
                matchedImg.defaultImgStyle.borderColor = targetImgStyle.borderColor;
                this.lastClickedImgDefaultStyle.borderWidth = targetImgStyle.borderWidth;
                this.lastClickedImgDefaultStyle.borderStyle = targetImgStyle.borderStyle;
                this.lastClickedImgDefaultStyle.borderColor = targetImgStyle.borderColor;
            }
            this.imgGlobalStatus.dragging = false;
            this.imgGlobalStatus.arrowUp = false;
            this.imgGlobalStatus.arrowDown = false;
            this.imgGlobalStatus.arrowLeft = false;
            this.imgGlobalStatus.arrowRight = false;
            matchedImg.invertColor = false;
            matchedImg.scaleX = false;
            matchedImg.scaleY = false;
            matchedImg.fullScreen = false;
            if (!this.imgGlobalStatus.popup) {
                this.resetClickTimer();
            }
        };
        /**
         * set 'data-oit-target' and lastClickedImgEl
         * @param targetEl
         */
        this.setLastClickedImg = (targetEl) => {
            if (!targetEl)
                return;
            // 'data-oit-target' is set for locating current image
            targetEl.setAttribute('data-oit-target', '1');
            this.lastClickedImgEl = targetEl;
        };
        //endregion
        //region ================== (Original) Image Border ========================
        this.addBorderForLastClickedImg = (targetEl) => {
            this.setLastClickedImg(targetEl);
            if (!targetEl || !this.plugin.settings.imageBorderToggle)
                return;
            const lastClickedImgStyle = targetEl === null || targetEl === void 0 ? void 0 : targetEl.style;
            if (!lastClickedImgStyle)
                return;
            lastClickedImgStyle.setProperty('border-width', this.plugin.settings.imageBorderWidth);
            lastClickedImgStyle.setProperty('border-style', this.plugin.settings.imageBorderStyle);
            lastClickedImgStyle.setProperty('border-color', this.plugin.settings.imageBorderColor);
        };
        /**
         * remove 'data-oit-target'
         * restore default border style
         */
        this.restoreBorderForLastClickedImg = () => {
            if (!this.lastClickedImgEl)
                return;
            this.lastClickedImgEl.removeAttribute('data-oit-target');
            const lastClickedImgStyle = this.lastClickedImgEl.style;
            if (lastClickedImgStyle) {
                lastClickedImgStyle.setProperty('border-width', this.lastClickedImgDefaultStyle.borderWidth);
                lastClickedImgStyle.setProperty('border-style', this.lastClickedImgDefaultStyle.borderStyle);
                lastClickedImgStyle.setProperty('border-color', this.lastClickedImgDefaultStyle.borderColor);
            }
        };
        //endregion
        //region ================== Image ========================
        this.updateImgViewElAndList = (imgInfo) => {
            if (!(imgInfo === null || imgInfo === void 0 ? void 0 : imgInfo.imgContainerEl))
                return;
            const pinMaximum = this.getConfiguredPinMaximum();
            const imgNum = this.imgInfo.imgList.length;
            if (pinMaximum < imgNum) {
                // remove all imgViewEl and imgList
                imgInfo.imgContainerEl.innerHTML = '';
                // clear imgList
                imgInfo.imgList.length = 0;
            }
            // let isUpdate: boolean = false;
            const curTime = new Date().getTime();
            for (let i = imgNum; i < pinMaximum; i++) {
                // <div class="oit-img-container"> `<img class='oit-img-view' data-index='0' src='' alt=''>` </div>
                let imgViewEl = createEl('img');
                imgViewEl.addClass(OIT_CLASS.IMG_VIEW);
                imgViewEl.hidden = true; // hide 'oit-img-view' for now
                imgViewEl.dataset.index = i + ''; // set data-index
                this.setImgViewDefaultBackground(imgViewEl);
                imgInfo.imgContainerEl.appendChild(imgViewEl);
                // cache imgList
                imgInfo.imgList.push(new ImgCto(i, curTime, imgViewEl));
                // isUpdate = true;
            }
        };
        this.getMatchedImg = () => {
            let earliestImg;
            for (const img of this.imgInfo.imgList) {
                if (!earliestImg || earliestImg.mtime > img.mtime)
                    earliestImg = img;
                if (img.popup)
                    continue;
                return img;
            }
            if (this.plugin.settings.pinCoverMode) {
                return earliestImg;
            }
            return null;
        };
        /**
         * it may from: renderContainerView(), switch GalleryNavbarView, click toolbar_refresh
         * @param imgCto
         * @param imgSrc
         * @param imgAlt
         * @param imgTitleIndex
         */
        this.refreshImg = (imgCto, imgSrc, imgAlt, imgTitleIndex) => {
            if (!imgSrc)
                imgSrc = imgCto.imgViewEl.src;
            if (!imgAlt)
                imgAlt = imgCto.imgViewEl.alt;
            this.renderImgTitle(imgAlt, imgTitleIndex);
            if (imgSrc) {
                if (imgCto.refreshImgInterval) {
                    clearInterval(imgCto.refreshImgInterval);
                    imgCto.refreshImgInterval = null;
                }
                let realImg = new Image();
                realImg.src = imgSrc;
                imgCto.refreshImgInterval = setInterval((realImg) => {
                    var _a, _b;
                    if (realImg.width > 0 || realImg.height > 0) {
                        clearInterval(imgCto.refreshImgInterval);
                        imgCto.refreshImgInterval = null;
                        this.setImgViewPosition(ImgUtil.calculateImgZoomSize(realImg, imgCto, (_a = this.parentContainerEl) === null || _a === void 0 ? void 0 : _a.clientWidth, (_b = this.parentContainerEl) === null || _b === void 0 ? void 0 : _b.clientHeight), 0);
                        this.renderImgView(imgCto.imgViewEl, imgSrc, imgAlt);
                        this.renderImgTip(imgCto);
                        imgCto.imgViewEl.style.setProperty('transform', imgCto.defaultImgStyle.transform);
                        imgCto.imgViewEl.style.setProperty('filter', imgCto.defaultImgStyle.filter);
                        imgCto.imgViewEl.style.setProperty('mix-blend-mode', imgCto.defaultImgStyle.mixBlendMode);
                    }
                }, 40, realImg);
            }
        };
        this.renderImgTitle = (name, index) => {
        };
        this.setImgViewPosition = (imgZoomSize, rotate) => {
            const imgViewEl = imgZoomSize.imgViewEl;
            if (!imgViewEl)
                return;
            if (imgZoomSize) {
                imgViewEl.setAttribute('width', imgZoomSize.curWidth + 'px');
                imgViewEl.style.setProperty('margin-top', imgZoomSize.top + 'px', 'important');
                imgViewEl.style.setProperty('margin-left', imgZoomSize.left + 'px', 'important');
            }
            const rotateDeg = rotate ? rotate : 0;
            imgViewEl.style.transform = 'rotate(' + rotateDeg + 'deg)';
            imgZoomSize.rotate = rotateDeg;
        };
        this.renderImgView = (imgViewEl, src, alt) => {
            if (!imgViewEl)
                return;
            imgViewEl.setAttribute('src', src);
            imgViewEl.setAttribute('alt', alt);
            imgViewEl.hidden = !src && !alt;
        };
        this.renderImgTip = (activeImg) => {
            if (!activeImg)
                activeImg = this.imgGlobalStatus.activeImg;
            if (activeImg && this.imgInfo.imgTipEl && activeImg.realWidth > 0 && activeImg.curWidth > 0) {
                if (this.imgInfo.imgTipTimeout) {
                    clearTimeout(this.imgInfo.imgTipTimeout);
                }
                if (this.plugin.settings.imgTipToggle) {
                    this.imgInfo.imgTipEl.hidden = false; // display 'oit-img-tip'
                    const ratio = activeImg.curWidth * 100 / activeImg.realWidth;
                    const isSingleDigit = 10 > ratio;
                    const width = isSingleDigit ? 20 : 40;
                    const left = activeImg.left + activeImg.curWidth / 2 - width / 2;
                    const top = activeImg.top + activeImg.curHeight / 2 - 10;
                    this.imgInfo.imgTipEl.style.setProperty("width", width + 'px');
                    this.imgInfo.imgTipEl.style.setProperty("font-size", isSingleDigit || 100 >= activeImg.curWidth ? 'xx-small' : 'x-small');
                    this.imgInfo.imgTipEl.style.setProperty("left", left + 'px');
                    this.imgInfo.imgTipEl.style.setProperty("top", top + 'px');
                    this.imgInfo.imgTipEl.style.setProperty("z-index", activeImg.zIndex + '');
                    this.imgInfo.imgTipEl.setText(parseInt(ratio + '') + '%');
                    this.imgInfo.imgTipTimeout = setTimeout(() => {
                        this.imgInfo.imgTipEl.hidden = true;
                    }, 1000);
                }
                else {
                    this.imgInfo.imgTipEl.hidden = true; // hide 'oit-img-tip'
                    this.imgInfo.imgTipTimeout = null;
                }
            }
        };
        this.setImgViewDefaultBackgroundForImgList = () => {
            for (const imgCto of this.imgInfo.imgList) {
                this.setImgViewDefaultBackground(imgCto.imgViewEl);
            }
        };
        this.setImgViewDefaultBackground = (imgViewEl) => {
            if (!imgViewEl)
                return;
            if (this.plugin.settings.imgViewBackgroundColor && IMG_DEFAULT_BACKGROUND_COLOR != this.plugin.settings.imgViewBackgroundColor) {
                imgViewEl.removeClass('img-default-background');
                imgViewEl.style.setProperty('background-color', this.plugin.settings.imgViewBackgroundColor);
            }
            else {
                imgViewEl.addClass('img-default-background');
                imgViewEl.style.removeProperty('background-color');
            }
        };
        this.setActiveImgZIndex = (activeImg) => {
        };
        //endregion
        //region ================== Gallery NavBar ========================
        this.switchImageOnGalleryNavBar = (event, next) => {
        };
        this.renderGalleryNavbar = () => {
        };
        this.removeGalleryNavbar = () => {
        };
        //endregion
        //region ================== full screen ========================
        /**
         * full-screen mode
         */
        this.showPlayerImg = (activeImg) => {
            if (!activeImg && !(activeImg = this.imgGlobalStatus.activeImg))
                return;
            this.imgGlobalStatus.fullScreen = true;
            activeImg.fullScreen = true;
            // activeImg.imgViewEl.style.setProperty('display', 'none', 'important'); // hide imgViewEl
            // this.imgInfoCto.imgFooterEl?.style.setProperty('display', 'none'); // hide 'oit-img-footer'
            // show the img-player
            this.imgInfo.imgPlayerEl.style.setProperty('display', 'block');
            this.imgInfo.imgPlayerEl.style.setProperty('z-index', (this.imgGlobalStatus.activeImgZIndex + 10) + '');
            this.imgInfo.imgPlayerEl.addEventListener('click', this.closePlayerImg);
            const windowWidth = this.doc.documentElement.clientWidth || this.doc.body.clientWidth;
            const windowHeight = this.doc.documentElement.clientHeight || this.doc.body.clientHeight;
            let newWidth, newHeight;
            let top = 0;
            if (IMG_FULL_SCREEN_MODE.STRETCH == this.plugin.settings.imgFullScreenMode) {
                newWidth = windowWidth + 'px';
                newHeight = windowHeight + 'px';
            }
            else if (IMG_FULL_SCREEN_MODE.FILL == this.plugin.settings.imgFullScreenMode) {
                newWidth = '100%';
                newHeight = '100%';
            }
            else {
                // fit
                const widthRatio = windowWidth / activeImg.realWidth;
                const heightRatio = windowHeight / activeImg.realHeight;
                if (widthRatio <= heightRatio) {
                    newWidth = windowWidth;
                    newHeight = widthRatio * activeImg.realHeight;
                }
                else {
                    newHeight = windowHeight;
                    newWidth = heightRatio * activeImg.realWidth;
                }
                top = (windowHeight - newHeight) / 2;
                newWidth = newWidth + 'px';
                newHeight = newHeight + 'px';
            }
            const imgPlayerImgViewEl = this.imgInfo.imgPlayerImgViewEl;
            if (imgPlayerImgViewEl) {
                imgPlayerImgViewEl.setAttribute('src', activeImg.imgViewEl.src);
                imgPlayerImgViewEl.setAttribute('alt', activeImg.imgViewEl.alt);
                imgPlayerImgViewEl.setAttribute('width', newWidth);
                imgPlayerImgViewEl.setAttribute('height', newHeight);
                imgPlayerImgViewEl.style.setProperty('margin-top', top + 'px');
                //this.imgInfo.imgPlayerImgViewEl.style.setProperty('margin-left', left + 'px');
                this.setImgViewDefaultBackground(imgPlayerImgViewEl);
            }
        };
        /**
         * close full screen
         */
        this.closePlayerImg = () => {
            for (const imgCto of this.imgInfo.imgList) {
                if (!imgCto.fullScreen)
                    continue;
                // show the popped up image
                // imgCto.imgViewEl?.style.setProperty('display', 'block', 'important');
                // this.imgInfoCto.imgFooterEl?.style.setProperty('display', 'block');
            }
            // hide full screen
            if (this.imgInfo.imgPlayerEl) {
                this.imgInfo.imgPlayerEl.style.setProperty('display', 'none'); // hide 'img-player'
                this.imgInfo.imgPlayerEl.removeEventListener('click', this.closePlayerImg);
            }
            if (this.imgInfo.imgPlayerImgViewEl) {
                this.imgInfo.imgPlayerImgViewEl.setAttribute('src', '');
                this.imgInfo.imgPlayerImgViewEl.setAttribute('alt', '');
            }
            this.imgGlobalStatus.fullScreen = false;
        };
        //endregion
        //region ================== events ========================
        this.addOrRemoveEvents = (matchedImg, isAdd) => {
            if (isAdd) {
                if (!this.imgGlobalStatus.popup) {
                    this.doc.addEventListener('keydown', this.triggerKeydown);
                    this.doc.addEventListener('keyup', this.triggerKeyup);
                }
                if (this.isNormalMode()) {
                    // click event: hide container view
                    this.imgInfo.oitContainerEl.addEventListener('click', this.closeContainerView);
                }
                matchedImg.imgViewEl.addEventListener('mouseenter', this.mouseenterImgView);
                matchedImg.imgViewEl.addEventListener('mouseleave', this.mouseleaveImgView);
                // drag the image via mouse
                matchedImg.imgViewEl.addEventListener('mousedown', this.mousedownImgView);
                matchedImg.imgViewEl.addEventListener('mouseup', this.mouseupImgView);
                // zoom the image via mouse wheel
                matchedImg.imgViewEl.addEventListener('mousewheel', this.mousewheelViewContainer, { passive: true });
            }
            else {
                if (!this.imgGlobalStatus.popup) {
                    this.doc.removeEventListener('keydown', this.triggerKeydown);
                    this.doc.removeEventListener('keyup', this.triggerKeyup);
                    if (this.imgGlobalStatus.clickTimer) {
                        clearTimeout(this.imgGlobalStatus.clickTimer);
                        this.imgGlobalStatus.clickTimer = null;
                        this.imgGlobalStatus.clickCount = 0;
                    }
                }
                if (!this.isPinMode()) {
                    this.imgInfo.oitContainerEl.removeEventListener('click', this.closeContainerView);
                }
                matchedImg.imgViewEl.removeEventListener('mouseenter', this.mouseenterImgView);
                matchedImg.imgViewEl.removeEventListener('mouseleave', this.mouseleaveImgView);
                matchedImg.imgViewEl.removeEventListener('mousedown', this.mousedownImgView);
                matchedImg.imgViewEl.removeEventListener('mouseup', this.mouseupImgView);
                matchedImg.imgViewEl.removeEventListener('mousewheel', this.mousewheelViewContainer);
                if (matchedImg.refreshImgInterval) {
                    clearInterval(matchedImg.refreshImgInterval);
                    matchedImg.refreshImgInterval = null;
                }
            }
        };
        this.triggerKeyup = (event) => {
            // console.log('keyup', event, event.key);
            const key = event.key;
            if (!key)
                return;
            if (!('Escape' === key)) {
                event.preventDefault();
                event.stopPropagation();
            }
            switch (key) {
                case 'Escape':
                    // close full screen, hide container view
                    this.imgGlobalStatus.fullScreen ? this.closePlayerImg() : this.closeContainerView();
                    break;
                case 'ArrowUp':
                    this.imgGlobalStatus.arrowUp = false;
                    break;
                case 'ArrowDown':
                    this.imgGlobalStatus.arrowDown = false;
                    break;
                case 'ArrowLeft':
                    this.imgGlobalStatus.arrowLeft = false;
                    // switch to the previous image on the gallery navBar
                    this.switchImageOnGalleryNavBar(event, false);
                    break;
                case 'ArrowRight':
                    this.imgGlobalStatus.arrowRight = false;
                    // switch to the next image on the gallery navBar
                    this.switchImageOnGalleryNavBar(event, true);
                    break;
            }
        };
        /**
         * move the image by keyboard
         * @param event
         */
        this.triggerKeydown = (event) => {
            //console.log('keydown', event, event.key, this.imgStatus);
            if (this.isPinMode())
                return;
            event.preventDefault();
            event.stopPropagation();
            if (this.imgGlobalStatus.arrowUp && this.imgGlobalStatus.arrowLeft) {
                this.moveImgViewByHotkey(event, 'UP_LEFT');
                return;
            }
            else if (this.imgGlobalStatus.arrowUp && this.imgGlobalStatus.arrowRight) {
                this.moveImgViewByHotkey(event, 'UP_RIGHT');
                return;
            }
            else if (this.imgGlobalStatus.arrowDown && this.imgGlobalStatus.arrowLeft) {
                this.moveImgViewByHotkey(event, 'DOWN_LEFT');
                return;
            }
            else if (this.imgGlobalStatus.arrowDown && this.imgGlobalStatus.arrowRight) {
                this.moveImgViewByHotkey(event, 'DOWN_RIGHT');
                return;
            }
            switch (event.key) {
                case 'ArrowUp':
                    this.imgGlobalStatus.arrowUp = true;
                    this.moveImgViewByHotkey(event, 'UP');
                    break;
                case 'ArrowDown':
                    this.imgGlobalStatus.arrowDown = true;
                    this.moveImgViewByHotkey(event, 'DOWN');
                    break;
                case 'ArrowLeft':
                    this.imgGlobalStatus.arrowLeft = true;
                    this.moveImgViewByHotkey(event, 'LEFT');
                    break;
                case 'ArrowRight':
                    this.imgGlobalStatus.arrowRight = true;
                    this.moveImgViewByHotkey(event, 'RIGHT');
                    break;
            }
        };
        this.moveImgViewByHotkey = (event, orientation) => {
            if (!orientation || !this.imgGlobalStatus.popup || !this.checkHotkeySettings(event, this.plugin.settings.moveTheImageHotkey))
                return;
            switch (orientation) {
                case 'UP':
                    this.mousemoveImgView(null, { offsetX: 0, offsetY: -this.plugin.settings.imageMoveSpeed });
                    break;
                case 'DOWN':
                    this.mousemoveImgView(null, { offsetX: 0, offsetY: this.plugin.settings.imageMoveSpeed });
                    break;
                case 'LEFT':
                    this.mousemoveImgView(null, { offsetX: -this.plugin.settings.imageMoveSpeed, offsetY: 0 });
                    break;
                case 'RIGHT':
                    this.mousemoveImgView(null, { offsetX: this.plugin.settings.imageMoveSpeed, offsetY: 0 });
                    break;
                case 'UP_LEFT':
                    this.mousemoveImgView(null, {
                        offsetX: -this.plugin.settings.imageMoveSpeed,
                        offsetY: -this.plugin.settings.imageMoveSpeed
                    });
                    break;
                case 'UP_RIGHT':
                    this.mousemoveImgView(null, {
                        offsetX: this.plugin.settings.imageMoveSpeed,
                        offsetY: -this.plugin.settings.imageMoveSpeed
                    });
                    break;
                case 'DOWN_LEFT':
                    this.mousemoveImgView(null, {
                        offsetX: -this.plugin.settings.imageMoveSpeed,
                        offsetY: this.plugin.settings.imageMoveSpeed
                    });
                    break;
                case 'DOWN_RIGHT':
                    this.mousemoveImgView(null, {
                        offsetX: this.plugin.settings.imageMoveSpeed,
                        offsetY: this.plugin.settings.imageMoveSpeed
                    });
                    break;
            }
        };
        this.checkHotkeySettings = (event, hotkey) => {
            // console.log("[oit] checkHotkeySettings: ", event.ctrlKey, event.altKey, event.shiftKey)
            switch (hotkey) {
                case "NONE":
                    return !event.ctrlKey && !event.altKey && !event.shiftKey;
                case "CTRL":
                    return event.ctrlKey && !event.altKey && !event.shiftKey;
                case "ALT":
                    return !event.ctrlKey && event.altKey && !event.shiftKey;
                case "SHIFT":
                    return !event.ctrlKey && !event.altKey && event.shiftKey;
                case "CTRL_ALT":
                    return event.ctrlKey && event.altKey && !event.shiftKey;
                case "CTRL_SHIFT":
                    return event.ctrlKey && !event.altKey && event.shiftKey;
                case "SHIFT_ALT":
                    return !event.ctrlKey && event.altKey && event.shiftKey;
                case "CTRL_SHIFT_ALT":
                    return event.ctrlKey && event.altKey && event.shiftKey;
            }
            return false;
        };
        this.mouseenterImgView = (event) => {
            this.resetClickTimer();
            event.stopPropagation();
            event.preventDefault();
            this.getAndUpdateActiveImg(event);
            // console.log('mouseenterImgView', event, this.imgGlobalStatus.activeImg);
        };
        this.mousedownImgView = (event) => {
            // console.log('mousedownImgView', event, this.imgGlobalStatus.activeImg, event.button);
            event.stopPropagation();
            event.preventDefault();
            const activeImg = this.getAndUpdateActiveImg(event);
            if (!activeImg)
                return;
            if (0 == event.button) { // left click
                this.setClickTimer(activeImg);
                this.setActiveImgZIndex(activeImg);
                this.imgGlobalStatus.dragging = true;
                // 鼠标相对于图片的位置
                activeImg.moveX = activeImg.imgViewEl.offsetLeft - event.clientX;
                activeImg.moveY = activeImg.imgViewEl.offsetTop - event.clientY;
                // 鼠标按下时持续触发/移动事件
                activeImg.imgViewEl.onmousemove = this.mousemoveImgView;
            }
        };
        /**
         * move the image by mouse or keyboard
         * @param event
         * @param offsetSize
         */
        this.mousemoveImgView = (event, offsetSize) => {
            // console.log('mousemoveImgView', event, this.imgGlobalStatus.activeImg);
            const activeImg = this.imgGlobalStatus.activeImg;
            if (!activeImg)
                return;
            if (event) {
                if (!this.imgGlobalStatus.dragging)
                    return;
                // drag via mouse cursor (Both Mode)
                activeImg.left = event.clientX + activeImg.moveX;
                activeImg.top = event.clientY + activeImg.moveY;
            }
            else if (offsetSize) {
                // move by arrow keys (Normal Mode)
                activeImg.left += offsetSize.offsetX;
                activeImg.top += offsetSize.offsetY;
            }
            else {
                return;
            }
            // move the image
            activeImg.imgViewEl.style.setProperty('margin-left', activeImg.left + 'px', 'important');
            activeImg.imgViewEl.style.setProperty('margin-top', activeImg.top + 'px', 'important');
        };
        this.mouseupImgView = (event) => {
            var _a;
            // console.log('mouseupImgView', event, this.imgGlobalStatus.activeImg);
            this.imgGlobalStatus.dragging = false;
            event.preventDefault();
            event.stopPropagation();
            const activeImg = this.imgGlobalStatus.activeImg;
            if (activeImg) {
                activeImg.imgViewEl.onmousemove = null;
                if (2 == event.button) { // right click
                    (_a = this.menuView) === null || _a === void 0 ? void 0 : _a.show(event, activeImg);
                }
            }
        };
        this.mouseleaveImgView = (event) => {
            // console.log('mouseleaveImgView', event, this.imgGlobalStatus.activeImg, '>>> set null');
            this.imgGlobalStatus.dragging = false;
            this.resetClickTimer();
            event.preventDefault();
            event.stopPropagation();
            const activeImg = this.imgGlobalStatus.activeImg;
            if (activeImg) {
                activeImg.imgViewEl.onmousemove = null;
                this.setActiveImgForMouseEvent(null); // for pin mode
            }
        };
        this.setClickTimer = (activeImg) => {
            ++this.imgGlobalStatus.clickCount;
            clearTimeout(this.imgGlobalStatus.clickTimer);
            this.imgGlobalStatus.clickTimer = setTimeout(() => {
                const clickCount = this.imgGlobalStatus.clickCount;
                this.resetClickTimer();
                if (2 === clickCount) { // double click
                    if (!activeImg)
                        activeImg = this.imgGlobalStatus.activeImg;
                    // console.log('mousedownImgView: double click...', activeImg.index);
                    this.clickImgToolbar(null, this.plugin.settings.doubleClickToolbar, activeImg);
                }
            }, 200);
        };
        this.resetClickTimer = () => {
            this.imgGlobalStatus.clickTimer = null;
            this.imgGlobalStatus.clickCount = 0;
        };
        this.getAndUpdateActiveImg = (event) => {
            const targetEl = event.target;
            let index;
            if (!targetEl || !(index = targetEl.dataset.index))
                return;
            const activeImg = this.imgInfo.imgList[parseInt(index)];
            if (activeImg && (!this.imgGlobalStatus.activeImg || activeImg.index !== this.imgGlobalStatus.activeImg.index)) {
                this.setActiveImgForMouseEvent(activeImg); // update activeImg
            }
            // console.log('getAndUpdateActiveImg: ', activeImg)
            return activeImg;
        };
        this.mousewheelViewContainer = (event) => {
            // event.preventDefault();
            event.stopPropagation();
            // @ts-ignore
            this.zoomAndRender(0 < event.wheelDelta ? 0.1 : -0.1, event);
        };
        this.zoomAndRender = (ratio, event, actualSize, activeImg) => {
            if (!activeImg) {
                activeImg = this.imgGlobalStatus.activeImg;
            }
            let activeImgViewEl;
            if (!activeImg || !(activeImgViewEl = activeImg.imgViewEl))
                return;
            let offsetSize = { offsetX: 0, offsetY: 0 };
            if (event) {
                offsetSize.offsetX = event.offsetX;
                offsetSize.offsetY = event.offsetY;
            }
            else {
                offsetSize.offsetX = activeImg.curWidth / 2;
                offsetSize.offsetY = activeImg.curHeight / 2;
            }
            const zoomData = ImgUtil.zoom(ratio, activeImg, offsetSize, actualSize);
            this.renderImgTip(activeImg);
            activeImgViewEl.setAttribute('width', zoomData.curWidth + 'px');
            activeImgViewEl.style.setProperty('margin-top', zoomData.top + 'px', 'important');
            activeImgViewEl.style.setProperty('margin-left', zoomData.left + 'px', 'important');
        };
        this.clickImgToolbar = (event, targetElClass, activeImg) => {
            if (!targetElClass && !activeImg) {
                if (!event)
                    return;
                // comes from clicking toolbar
                targetElClass = event.target.className;
                activeImg = this.imgGlobalStatus.activeImg;
            }
            switch (targetElClass) {
                case 'toolbar_zoom_to_100':
                    this.zoomAndRender(null, null, true, activeImg);
                    break;
                case 'toolbar_zoom_in':
                    this.zoomAndRender(0.1);
                    break;
                case 'toolbar_zoom_out':
                    this.zoomAndRender(-0.1);
                    break;
                case 'toolbar_full_screen':
                    this.showPlayerImg(activeImg);
                    break;
                case 'toolbar_refresh':
                    this.refreshImg(activeImg);
                    break;
                case 'toolbar_rotate_left':
                    activeImg.rotate -= 90;
                    ImgUtil.transform(activeImg);
                    break;
                case 'toolbar_rotate_right':
                    activeImg.rotate += 90;
                    ImgUtil.transform(activeImg);
                    break;
                case 'toolbar_scale_x':
                    activeImg.scaleX = !activeImg.scaleX;
                    ImgUtil.transform(activeImg);
                    break;
                case 'toolbar_scale_y':
                    activeImg.scaleY = !activeImg.scaleY;
                    ImgUtil.transform(activeImg);
                    break;
                case 'toolbar_invert_color':
                    activeImg.invertColor = !activeImg.invertColor;
                    ImgUtil.invertImgColor(activeImg.imgViewEl, activeImg.invertColor);
                    break;
                case 'toolbar_copy':
                    ImgUtil.copyImage(activeImg.imgViewEl, activeImg.curWidth, activeImg.curHeight);
                    break;
                case 'toolbar_close':
                    this.closeContainerView(event, activeImg);
                    break;
            }
        };
        this.plugin = plugin;
    }
}

var Md5 = /** @class */ (function () {
    function Md5() {
    }
    Md5.AddUnsigned = function (lX, lY) {
        var lX4, lY4, lX8, lY8, lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (!!(lX4 & lY4)) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }
        if (!!(lX4 | lY4)) {
            if (!!(lResult & 0x40000000)) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            }
            else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        }
        else {
            return (lResult ^ lX8 ^ lY8);
        }
    };
    Md5.FF = function (a, b, c, d, x, s, ac) {
        a = this.AddUnsigned(a, this.AddUnsigned(this.AddUnsigned(this.F(b, c, d), x), ac));
        return this.AddUnsigned(this.RotateLeft(a, s), b);
    };
    Md5.GG = function (a, b, c, d, x, s, ac) {
        a = this.AddUnsigned(a, this.AddUnsigned(this.AddUnsigned(this.G(b, c, d), x), ac));
        return this.AddUnsigned(this.RotateLeft(a, s), b);
    };
    Md5.HH = function (a, b, c, d, x, s, ac) {
        a = this.AddUnsigned(a, this.AddUnsigned(this.AddUnsigned(this.H(b, c, d), x), ac));
        return this.AddUnsigned(this.RotateLeft(a, s), b);
    };
    Md5.II = function (a, b, c, d, x, s, ac) {
        a = this.AddUnsigned(a, this.AddUnsigned(this.AddUnsigned(this.I(b, c, d), x), ac));
        return this.AddUnsigned(this.RotateLeft(a, s), b);
    };
    Md5.ConvertToWordArray = function (string) {
        var lWordCount, lMessageLength = string.length, lNumberOfWords_temp1 = lMessageLength + 8, lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64, lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16, lWordArray = Array(lNumberOfWords - 1), lBytePosition = 0, lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    };
    Md5.WordToHex = function (lValue) {
        var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
        }
        return WordToHexValue;
    };
    Md5.Utf8Encode = function (string) {
        var utftext = "", c;
        string = string.replace(/\r\n/g, "\n");
        for (var n = 0; n < string.length; n++) {
            c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    };
    Md5.init = function (string) {
        var temp;
        if (typeof string !== 'string')
            string = JSON.stringify(string);
        this._string = this.Utf8Encode(string);
        this.x = this.ConvertToWordArray(this._string);
        this.a = 0x67452301;
        this.b = 0xEFCDAB89;
        this.c = 0x98BADCFE;
        this.d = 0x10325476;
        for (this.k = 0; this.k < this.x.length; this.k += 16) {
            this.AA = this.a;
            this.BB = this.b;
            this.CC = this.c;
            this.DD = this.d;
            this.a = this.FF(this.a, this.b, this.c, this.d, this.x[this.k], this.S11, 0xD76AA478);
            this.d = this.FF(this.d, this.a, this.b, this.c, this.x[this.k + 1], this.S12, 0xE8C7B756);
            this.c = this.FF(this.c, this.d, this.a, this.b, this.x[this.k + 2], this.S13, 0x242070DB);
            this.b = this.FF(this.b, this.c, this.d, this.a, this.x[this.k + 3], this.S14, 0xC1BDCEEE);
            this.a = this.FF(this.a, this.b, this.c, this.d, this.x[this.k + 4], this.S11, 0xF57C0FAF);
            this.d = this.FF(this.d, this.a, this.b, this.c, this.x[this.k + 5], this.S12, 0x4787C62A);
            this.c = this.FF(this.c, this.d, this.a, this.b, this.x[this.k + 6], this.S13, 0xA8304613);
            this.b = this.FF(this.b, this.c, this.d, this.a, this.x[this.k + 7], this.S14, 0xFD469501);
            this.a = this.FF(this.a, this.b, this.c, this.d, this.x[this.k + 8], this.S11, 0x698098D8);
            this.d = this.FF(this.d, this.a, this.b, this.c, this.x[this.k + 9], this.S12, 0x8B44F7AF);
            this.c = this.FF(this.c, this.d, this.a, this.b, this.x[this.k + 10], this.S13, 0xFFFF5BB1);
            this.b = this.FF(this.b, this.c, this.d, this.a, this.x[this.k + 11], this.S14, 0x895CD7BE);
            this.a = this.FF(this.a, this.b, this.c, this.d, this.x[this.k + 12], this.S11, 0x6B901122);
            this.d = this.FF(this.d, this.a, this.b, this.c, this.x[this.k + 13], this.S12, 0xFD987193);
            this.c = this.FF(this.c, this.d, this.a, this.b, this.x[this.k + 14], this.S13, 0xA679438E);
            this.b = this.FF(this.b, this.c, this.d, this.a, this.x[this.k + 15], this.S14, 0x49B40821);
            this.a = this.GG(this.a, this.b, this.c, this.d, this.x[this.k + 1], this.S21, 0xF61E2562);
            this.d = this.GG(this.d, this.a, this.b, this.c, this.x[this.k + 6], this.S22, 0xC040B340);
            this.c = this.GG(this.c, this.d, this.a, this.b, this.x[this.k + 11], this.S23, 0x265E5A51);
            this.b = this.GG(this.b, this.c, this.d, this.a, this.x[this.k], this.S24, 0xE9B6C7AA);
            this.a = this.GG(this.a, this.b, this.c, this.d, this.x[this.k + 5], this.S21, 0xD62F105D);
            this.d = this.GG(this.d, this.a, this.b, this.c, this.x[this.k + 10], this.S22, 0x2441453);
            this.c = this.GG(this.c, this.d, this.a, this.b, this.x[this.k + 15], this.S23, 0xD8A1E681);
            this.b = this.GG(this.b, this.c, this.d, this.a, this.x[this.k + 4], this.S24, 0xE7D3FBC8);
            this.a = this.GG(this.a, this.b, this.c, this.d, this.x[this.k + 9], this.S21, 0x21E1CDE6);
            this.d = this.GG(this.d, this.a, this.b, this.c, this.x[this.k + 14], this.S22, 0xC33707D6);
            this.c = this.GG(this.c, this.d, this.a, this.b, this.x[this.k + 3], this.S23, 0xF4D50D87);
            this.b = this.GG(this.b, this.c, this.d, this.a, this.x[this.k + 8], this.S24, 0x455A14ED);
            this.a = this.GG(this.a, this.b, this.c, this.d, this.x[this.k + 13], this.S21, 0xA9E3E905);
            this.d = this.GG(this.d, this.a, this.b, this.c, this.x[this.k + 2], this.S22, 0xFCEFA3F8);
            this.c = this.GG(this.c, this.d, this.a, this.b, this.x[this.k + 7], this.S23, 0x676F02D9);
            this.b = this.GG(this.b, this.c, this.d, this.a, this.x[this.k + 12], this.S24, 0x8D2A4C8A);
            this.a = this.HH(this.a, this.b, this.c, this.d, this.x[this.k + 5], this.S31, 0xFFFA3942);
            this.d = this.HH(this.d, this.a, this.b, this.c, this.x[this.k + 8], this.S32, 0x8771F681);
            this.c = this.HH(this.c, this.d, this.a, this.b, this.x[this.k + 11], this.S33, 0x6D9D6122);
            this.b = this.HH(this.b, this.c, this.d, this.a, this.x[this.k + 14], this.S34, 0xFDE5380C);
            this.a = this.HH(this.a, this.b, this.c, this.d, this.x[this.k + 1], this.S31, 0xA4BEEA44);
            this.d = this.HH(this.d, this.a, this.b, this.c, this.x[this.k + 4], this.S32, 0x4BDECFA9);
            this.c = this.HH(this.c, this.d, this.a, this.b, this.x[this.k + 7], this.S33, 0xF6BB4B60);
            this.b = this.HH(this.b, this.c, this.d, this.a, this.x[this.k + 10], this.S34, 0xBEBFBC70);
            this.a = this.HH(this.a, this.b, this.c, this.d, this.x[this.k + 13], this.S31, 0x289B7EC6);
            this.d = this.HH(this.d, this.a, this.b, this.c, this.x[this.k], this.S32, 0xEAA127FA);
            this.c = this.HH(this.c, this.d, this.a, this.b, this.x[this.k + 3], this.S33, 0xD4EF3085);
            this.b = this.HH(this.b, this.c, this.d, this.a, this.x[this.k + 6], this.S34, 0x4881D05);
            this.a = this.HH(this.a, this.b, this.c, this.d, this.x[this.k + 9], this.S31, 0xD9D4D039);
            this.d = this.HH(this.d, this.a, this.b, this.c, this.x[this.k + 12], this.S32, 0xE6DB99E5);
            this.c = this.HH(this.c, this.d, this.a, this.b, this.x[this.k + 15], this.S33, 0x1FA27CF8);
            this.b = this.HH(this.b, this.c, this.d, this.a, this.x[this.k + 2], this.S34, 0xC4AC5665);
            this.a = this.II(this.a, this.b, this.c, this.d, this.x[this.k], this.S41, 0xF4292244);
            this.d = this.II(this.d, this.a, this.b, this.c, this.x[this.k + 7], this.S42, 0x432AFF97);
            this.c = this.II(this.c, this.d, this.a, this.b, this.x[this.k + 14], this.S43, 0xAB9423A7);
            this.b = this.II(this.b, this.c, this.d, this.a, this.x[this.k + 5], this.S44, 0xFC93A039);
            this.a = this.II(this.a, this.b, this.c, this.d, this.x[this.k + 12], this.S41, 0x655B59C3);
            this.d = this.II(this.d, this.a, this.b, this.c, this.x[this.k + 3], this.S42, 0x8F0CCC92);
            this.c = this.II(this.c, this.d, this.a, this.b, this.x[this.k + 10], this.S43, 0xFFEFF47D);
            this.b = this.II(this.b, this.c, this.d, this.a, this.x[this.k + 1], this.S44, 0x85845DD1);
            this.a = this.II(this.a, this.b, this.c, this.d, this.x[this.k + 8], this.S41, 0x6FA87E4F);
            this.d = this.II(this.d, this.a, this.b, this.c, this.x[this.k + 15], this.S42, 0xFE2CE6E0);
            this.c = this.II(this.c, this.d, this.a, this.b, this.x[this.k + 6], this.S43, 0xA3014314);
            this.b = this.II(this.b, this.c, this.d, this.a, this.x[this.k + 13], this.S44, 0x4E0811A1);
            this.a = this.II(this.a, this.b, this.c, this.d, this.x[this.k + 4], this.S41, 0xF7537E82);
            this.d = this.II(this.d, this.a, this.b, this.c, this.x[this.k + 11], this.S42, 0xBD3AF235);
            this.c = this.II(this.c, this.d, this.a, this.b, this.x[this.k + 2], this.S43, 0x2AD7D2BB);
            this.b = this.II(this.b, this.c, this.d, this.a, this.x[this.k + 9], this.S44, 0xEB86D391);
            this.a = this.AddUnsigned(this.a, this.AA);
            this.b = this.AddUnsigned(this.b, this.BB);
            this.c = this.AddUnsigned(this.c, this.CC);
            this.d = this.AddUnsigned(this.d, this.DD);
        }
        temp = this.WordToHex(this.a) + this.WordToHex(this.b) + this.WordToHex(this.c) + this.WordToHex(this.d);
        return temp.toLowerCase();
    };
    Md5.x = Array();
    Md5.S11 = 7;
    Md5.S12 = 12;
    Md5.S13 = 17;
    Md5.S14 = 22;
    Md5.S21 = 5;
    Md5.S22 = 9;
    Md5.S23 = 14;
    Md5.S24 = 20;
    Md5.S31 = 4;
    Md5.S32 = 11;
    Md5.S33 = 16;
    Md5.S34 = 23;
    Md5.S41 = 6;
    Md5.S42 = 10;
    Md5.S43 = 15;
    Md5.S44 = 21;
    Md5.RotateLeft = function (lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); };
    Md5.F = function (x, y, z) { return (x & y) | ((~x) & z); };
    Md5.G = function (x, y, z) { return (x & z) | (y & (~z)); };
    Md5.H = function (x, y, z) { return (x ^ y ^ z); };
    Md5.I = function (x, y, z) { return (y ^ (x | (~z))); };
    return Md5;
}());

class GalleryImgCto {
    constructor(alt, src) {
        this.alt = alt;
        this.src = src;
    }
}
class GalleryImgCacheCto {
    constructor(file, galleryImgList, mtime) {
        this.file = file;
        this.galleryImgList = galleryImgList;
        this.mtime = mtime;
    }
}

class FileCto {
    constructor(path, ctime, mtime) {
        this.path = path;
        this.ctime = ctime;
        this.mtime = mtime;
    }
}

/* // const imgList: Array<GalleryImg> = parseMarkDown(plugin, activeView.sourceMode?.cmEditor, activeView.file.path);
export const parseMarkDown = (plugin: ImageToolkitPlugin, cm: CodeMirror.Editor, filePath: string) => {
    let line, lineText;
    for (let i = 0, lastLine = cm.lastLine(); i <= lastLine; i++) {
        if (!(line = cm.lineInfo(i))) continue;
        if (!(lineText = line.text)) continue;
        console.debug((i + 1) + ' line: ' + lineText);
    }
} */
const parseActiveViewData = (plugin, lines, file) => {
    if (!lines || 0 >= lines.length)
        return null;
    let lineText;
    let isCodeArea = false;
    let textArr;
    const imgList = new Array();
    for (let i = 0, len = lines.length; i < len; i++) {
        if (!(lineText = lines[i]))
            continue;
        // console.log((i + 1) + ' line: ' + lineText);
        if (lineText.startsWith('```')) {
            isCodeArea = !isCodeArea;
            continue;
        }
        if (isCodeArea)
            continue;
        if (textArr = getNonCodeAreaTexts(lineText)) {
            for (const text of textArr) {
                extractImage(text, imgList);
            }
        }
        else {
            extractImage(lineText, imgList);
        }
    }
    const filePath = file.path;
    for (let i = 0, len = imgList.length; i < len; i++) {
        const img = imgList[i];
        if (img.convert) {
            const imageFile = plugin.app.metadataCache.getFirstLinkpathDest(decodeURIComponent(img.src), filePath);
            img.src = imageFile ? plugin.app.vault.getResourcePath(imageFile) : '';
        }
        img.hash = md5Img(img.alt, img.src);
        img.match = null;
        img.name = null;
    }
    return new GalleryImgCacheCto(new FileCto(file.path, file.stat.ctime, file.stat.mtime), imgList, new Date().getTime());
};
const getNonCodeAreaTexts = (lineText) => {
    let textArr = [];
    const idx1 = lineText.indexOf('`');
    if (0 > idx1)
        return null;
    const idx2 = lineText.lastIndexOf('`');
    if (idx1 === idx2)
        return null;
    if (idx1 > 0)
        textArr.push(lineText.substring(0, idx1));
    if (lineText.length - 1 > idx2)
        textArr.push(lineText.substring(idx2 + 1));
    return textArr;
};
const IMAGE_LINK_REGEX1 = /\[\s*?(!\[(.*?)\]\((.*?)\))\s*?\]\(.*?\)/; // 1-link: [ ![alt1|alt2|...|altn|width](src) ](https://...)
// markdown: `![alt1|alt2|...|altn|width](src)` -> 1: alt (alt+width), 2: src
const RE_MARKDOWN_IMAGE = /!\[(.*?)\]\(\s*(.*?\.(jpe?g|png|svg|gif|bmp|webp))\s*\)/i; // 1: ![alt1|alt2|...|altn|width](src)
const IMAGE_LINK_REGEX2 = /\[\s*?(!\[\[(.*?[jpe?g|png|gif|svg|bmp].*?)\]\])\s*?\]\(.*?\)/i; // 2-link: [ ![[src|alt1|alt2|width]] ](https://...)
// RE_WIKILINK_IMAGE wikilink: `![[bird.png|alt1|alt2|2.1|50]]` -> 1: src+alt+width
const RE_WIKILINK_IMAGE = /!\[\[(.*?\.(jpe?g|png|svg|gif|bmp|webp).*?)\]\]/i; // 2: ![[src|alt1|alt2|width]]
const SRC_LINK_REGEX = /[a-z][a-z0-9+\-.]+:\/.*/i; // match link: http://, file://, app:// 
const SRC_IMG_REGREX = /.*?\.jpe?g|png|gif|svg|bmp/i; // match image ext: .jpg/.jpeg/.png/.gif/.svg/.bmp
const IMG_TAG_LINK_SRC_REGEX = /<a.*?(<img.*?src=[\'"](.*?)[\'"].*?\/?>).*?\/a>/i; // 3-a-img-src: <a> <img ... src=''/> </a>
const IMG_TAG_SRC_REGEX = /<img.*?src=[\'"](.*?)[\'"].*?\/?>/i; // 3-img-src: <img ... src='' />
const IMG_TAG_ALT_REGEX = /<img.*?alt=[\'"](.*?)[\'"].*?\/?>/i; // 3-img-alt: <img ... alt='' />
const FULL_PATH_REGEX = /^[a-z]\:.*?[jpe?g|png|gif|svg|bmp]/i;
const BLOCKQUOTE_PREFIX = `#^`;
const IMG_MATCH_MIN_LEN = 7;
const extractImage = (text, imgList) => {
    text = text.replace('\\|', '|');
    let img;
    if (!(img = matchImage1(text))) {
        if (!(img = matchImage2(text))) {
            if (!(img = matchImageTag(text))) {
                return;
            }
        }
    }
    imgList.push(img);
    if (img.match) {
        const idx = img.match.index + img.match[0].length;
        if (idx > text.length - IMG_MATCH_MIN_LEN)
            return;
        extractImage(text.substring(idx), imgList);
    }
};
/**
 * ![alt1|alt2|...|altn|width](src)
 * @param text
 * @returns
 */
const matchImage1 = (text) => {
    var _a;
    let match = text.match(IMAGE_LINK_REGEX1); // 1-link: [ ![alt1|alt2|...|altn|width](src) ](https://...)
    let link = false;
    let alt, src;
    if (match) {
        link = true;
        alt = match[2];
        src = match[3];
    }
    else {
        match = text.match(RE_MARKDOWN_IMAGE); // 1: ![alt1|alt2|...|altn|width](src)
        if (match) {
            if (alt = match[1]) {
                if (0 <= alt.indexOf('[') && 0 <= alt.indexOf(']'))
                    return;
            }
            src = match[2];
            if (src && src.startsWith(BLOCKQUOTE_PREFIX))
                return;
        }
    }
    if (!match)
        return null;
    const img = new GalleryImgCto();
    img.link = link;
    img.match = match;
    img.alt = alt;
    img.src = src;
    let width;
    if (img.src) {
        if (SRC_LINK_REGEX.test(img.src)) { // 1.2: match link: http://, file://, app://local/
            if (img.src.startsWith('file://')) {
                img.src = img.src.replace(/^file:\/+/, 'app://local/');
            }
        }
        else if (SRC_IMG_REGREX.test(img.src)) { // 1.3: match image ext: .jpg/.jpeg/.png/.gif/.svg/.bmp
            const srcArr = img.src.split('/');
            if (srcArr && 0 < srcArr.length) {
                img.name = srcArr[srcArr.length - 1];
            }
            img.convert = true;
        }
    }
    const altArr = (_a = img.alt) === null || _a === void 0 ? void 0 : _a.split('\|'); // match[1] = alt1|alt2|...|altn|width
    if (altArr && 1 < altArr.length) {
        if (/\d+/.test(width = altArr[altArr.length - 1])) {
            img.alt = img.alt.substring(0, img.alt.length - width.length - 1);
        }
    }
    return img;
};
/**
 * ![[src|alt1|alt2|width]]
 * @param text
 * @returns
 */
const matchImage2 = (text) => {
    let match = text.match(IMAGE_LINK_REGEX2); // 2-link: [ ![[src|alt1|alt2|width]] ](https://...)
    let link = false;
    let content;
    if (match) {
        link = true;
        content = match[2];
    }
    else {
        match = text.match(RE_WIKILINK_IMAGE); // 2: ![[src|alt1|alt2|width]]
        content = match ? match[1] : null;
        if (content && content.startsWith(BLOCKQUOTE_PREFIX))
            return;
    }
    if (!match)
        return null;
    const img = new GalleryImgCto();
    img.link = link;
    img.match = match;
    const contentArr = content === null || content === void 0 ? void 0 : content.split('|');
    if (contentArr && 0 < contentArr.length && (img.src = contentArr[0].trim())) {
        const srcArr = img.src.split('/');
        if (srcArr && 0 < srcArr.length) {
            img.name = srcArr[srcArr.length - 1];
        }
        if (1 == contentArr.length) {
            img.alt = img.src;
        }
        else {
            img.alt = '';
            for (let i = 1; i < contentArr.length; i++) {
                if (i == contentArr.length - 1 && /\d+/.test(contentArr[i]))
                    break;
                if (img.alt)
                    img.alt += '|';
                img.alt += contentArr[i];
            }
        }
        img.convert = true;
    }
    return img;
};
const matchImageTag = (text) => {
    let match = text.match(IMG_TAG_LINK_SRC_REGEX); // 3-a-img-src: <a> <img ... src=''/> </a>
    let link = false;
    if (match) {
        link = true;
    }
    else {
        match = text.match(IMG_TAG_SRC_REGEX); // 3-img-src: <img ... src='' />
    }
    if (!match)
        return null;
    const img = new GalleryImgCto();
    img.link = link;
    img.match = match;
    img.src = img.link ? match[2] : match[1];
    if (img.src) {
        if (img.src.startsWith('file://')) {
            img.src = img.src.replace(/^file:\/+/, 'app://local/');
        }
        else if (FULL_PATH_REGEX.test(img.src)) {
            img.src = 'app://local/' + img.src;
        }
    }
    const matchAlt = text.match(IMG_TAG_ALT_REGEX);
    img.alt = matchAlt ? matchAlt[1] : '';
    return img;
};
const md5Img = (alt, src) => {
    return Md5.init((alt ? alt : '') + '_' + src);
};

class GalleryNavbarView {
    constructor(mainContainerView, plugin) {
        // whether to display gallery navbar
        this.state = false;
        this.galleryNavbarEl = null;
        this.galleryListEl = null;
        this.galleryIsMousingDown = false;
        this.galleryMouseDownClientX = 0;
        this.galleryTranslateX = 0;
        this.CACHE_LIMIT = 10;
        this.CLICK_TIME = 150;
        this.renderGalleryImg = (imgFooterEl) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.state)
                return;
            // get all of images on the current editor
            const activeView = this.plugin.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
            if (!activeView
                || 'markdown' !== activeView.getViewType()
                // modal-container: community plugin, flashcards (Space Repetition)
                || 0 < this.mainContainerView.getDoc().getElementsByClassName('modal-container').length) {
                if (this.galleryNavbarEl)
                    this.galleryNavbarEl.hidden = true;
                if (this.galleryListEl)
                    this.galleryListEl.innerHTML = '';
                return;
            }
            // <div class="gallery-navbar"> <ul class="gallery-list"> <li> <img src='' alt=''> </li> <li...> <ul> </div>
            this.initGalleryNavbar(imgFooterEl);
            const activeFile = activeView.file;
            let galleryImg = this.getGalleryImgCache(activeFile);
            // let hitCache: boolean = true;
            if (!galleryImg) {
                // hitCache = false;
                galleryImg = parseActiveViewData(this.plugin, (_a = activeView.data) === null || _a === void 0 ? void 0 : _a.split('\n'), activeFile);
                this.setGalleryImgCache(galleryImg);
            }
            // console.log('oit-gallery-navbar: ' + (hitCache ? 'hit cache' : 'miss cache') + '!', galleryImg);
            const imgList = galleryImg.galleryImgList;
            const imgContextHash = this.getTargetImgContextHash(this.mainContainerView.getLastClickedImgEl(), activeView.containerEl, this.plugin.imgSelector);
            let liEl, imgEl, liElActive;
            let imgListEl = new Array();
            let targetImageIdx = -1, targetRealIdx = 0;
            let isAddGalleryActive = false;
            let prevHash, nextHash;
            const viewImageWithLink = this.plugin.settings.viewImageWithLink;
            for (let i = 0, len = imgList.length; i < len; i++) {
                const img = imgList[i];
                if (!viewImageWithLink && img.link)
                    continue;
                // <li> <img class='gallery-img' src='' alt=''> </li>
                this.galleryListEl.append(liEl = createEl('li'));
                liEl.append(imgEl = createEl('img'));
                imgEl.addClass('gallery-img', 'oit-img');
                imgEl.setAttr('alt', img.alt);
                imgEl.setAttr('src', img.src);
                imgListEl.push(imgEl);
                this.mainContainerView.setImgViewDefaultBackground(imgEl);
                // find the target image (which image is just clicked)
                if (!imgContextHash || isAddGalleryActive)
                    continue;
                if (imgContextHash[1] == img.hash) {
                    if (0 > targetImageIdx) {
                        targetImageIdx = i;
                        liElActive = liEl;
                        targetRealIdx = imgListEl.length;
                    }
                    if (0 == i) {
                        prevHash = null;
                        nextHash = 1 < len ? imgList[i + 1].hash : null;
                    }
                    else if (len - 1 == i) {
                        prevHash = imgList[i - 1].hash;
                        nextHash = null;
                    }
                    else {
                        prevHash = imgList[i - 1].hash;
                        nextHash = imgList[i + 1].hash;
                    }
                    if (imgContextHash[0] == prevHash && imgContextHash[2] == nextHash) {
                        isAddGalleryActive = true;
                        liElActive = liEl;
                    }
                }
            }
            const realTotalNum = imgListEl.length;
            this.mainContainerView.renderImgTitle(null, '[' + targetRealIdx + '/' + realTotalNum + ']');
            imgListEl.forEach((value, index) => {
                value.dataset.index = '[' + (index + 1) + '/' + realTotalNum + ']';
            });
            if (0 <= targetImageIdx) {
                if (liElActive) {
                    liElActive.addClass('gallery-active');
                    if (this.settings.galleryImgBorderActive) {
                        liElActive.addClass('img-border-active');
                        liElActive.style.setProperty('border-color', this.settings.galleryImgBorderActiveColor);
                    }
                }
                this.galleryTranslateX = (this.mainContainerView.getDoc().documentElement.clientWidth || this.mainContainerView.getDoc().body.clientWidth) / 2.5 - targetImageIdx * 52;
                this.galleryListEl.style.transform = 'translateX(' + this.galleryTranslateX + 'px)';
            }
        });
        this.initDefaultData = () => {
            this.galleryMouseDownClientX = 0;
            this.galleryTranslateX = 0;
            if (this.galleryListEl) {
                this.galleryListEl.style.transform = 'translateX(0px)';
                // remove all childs (li) of gallery-list
                this.galleryListEl.innerHTML = '';
            }
        };
        this.initGalleryNavbar = (imgFooterEl) => {
            // <div class="gallery-navbar">
            if (!this.galleryNavbarEl) {
                // imgInfo.imgFooterEl.append(galleryNavbarEl = createDiv());
                imgFooterEl.append(this.galleryNavbarEl = createDiv());
                this.galleryNavbarEl.addClass('gallery-navbar');
                this.galleryNavbarEl.onmouseover = () => {
                    this.galleryNavbarEl.style.setProperty('background-color', this.settings.galleryNavbarHoverColor);
                };
                this.galleryNavbarEl.onmouseout = () => {
                    this.galleryNavbarEl.style.setProperty('background-color', this.settings.galleryNavbarDefaultColor);
                };
                // add events
                this.galleryNavbarEl.addEventListener('mousedown', this.mouseDownGallery);
                this.galleryNavbarEl.addEventListener('mousemove', this.mouseMoveGallery);
                this.galleryNavbarEl.addEventListener('mouseup', this.mouseUpGallery);
                this.galleryNavbarEl.addEventListener('mouseleave', this.mouseLeaveGallery);
            }
            this.galleryNavbarEl.style.setProperty('background-color', this.settings.galleryNavbarDefaultColor);
            if (!this.galleryListEl) {
                this.galleryNavbarEl.append(this.galleryListEl = createEl('ul')); // <ul class="gallery-list">
                this.galleryListEl.addClass('gallery-list');
            }
            this.initDefaultData();
            this.galleryNavbarEl.hidden = false; // display 'gallery-navbar'
            this.state = true;
        };
        this.closeGalleryNavbar = () => {
            if (!this.state)
                return;
            this.galleryNavbarEl.hidden = true; // hide 'gallery-navbar'
            this.state = false;
            this.initDefaultData();
        };
        this.remove = () => {
            var _a, _b;
            this.state = false;
            (_a = this.galleryNavbarEl) === null || _a === void 0 ? void 0 : _a.remove();
            (_b = this.galleryListEl) === null || _b === void 0 ? void 0 : _b.remove();
            this.galleryNavbarEl = null;
            this.galleryListEl = null;
            this.galleryIsMousingDown = false;
            this.galleryMouseDownClientX = 0;
            this.galleryTranslateX = 0;
            this.mouseDownTime = null;
            GalleryNavbarView.GALLERY_IMG_CACHE = new Map();
            this.initDefaultData();
        };
        this.getTargetImgContextHash = (targetImgEl, containerEl, imageSelector) => {
            let imgEl;
            let targetImgHash = null;
            let targetIdx = -1;
            const imgs = containerEl.querySelectorAll(imageSelector);
            // console.log('IMAGE_SELECTOR>>', imageSelector, imgs);
            const len = imgs.length;
            for (let i = 0; i < len; i++) {
                if ((imgEl = imgs[i])) {
                    if ('1' == imgEl.getAttribute('data-oit-target')) {
                        targetIdx = i;
                        targetImgHash = md5Img(imgEl.alt, imgEl.src);
                        break;
                    }
                }
            }
            if (0 > targetIdx)
                targetImgHash = md5Img(targetImgEl.alt, targetImgEl.src);
            let prevHash, nextHash;
            if (0 == targetIdx) {
                prevHash = null;
                nextHash = 1 < len ? md5Img(imgs[1].alt, imgs[1].src) : null;
            }
            else if (len - 1 == targetIdx) {
                prevHash = md5Img(imgs[targetIdx - 1].alt, imgs[targetIdx - 1].src);
                nextHash = null;
            }
            else {
                prevHash = md5Img(imgs[targetIdx - 1].alt, imgs[targetIdx - 1].src);
                nextHash = md5Img(imgs[targetIdx + 1].alt, imgs[targetIdx + 1].src);
            }
            return [prevHash, targetImgHash, nextHash];
        };
        this.activateImage = (liEl, imgEL) => {
            if (!liEl || 'LI' !== liEl.tagName)
                return;
            if (!imgEL) {
                const imgELList = liEl.getElementsByTagName('img');
                if (imgELList && 0 < imgELList.length) {
                    imgEL = imgELList[0];
                }
            }
            if (imgEL) {
                const activeImg = this.mainContainerView.getActiveImg();
                this.mainContainerView.initDefaultData(activeImg, imgEL.style);
                this.mainContainerView.refreshImg(activeImg, imgEL.src, imgEL.alt || '', imgEL.dataset.index);
            }
            liEl.addClass('gallery-active');
            if (this.settings.galleryImgBorderActive) {
                liEl.addClass('img-border-active');
                liEl.style.setProperty('border-color', this.settings.galleryImgBorderActiveColor);
            }
        };
        this.deactivateImage = (liEl) => {
            if (!liEl)
                return;
            liEl.removeClass('gallery-active');
            if (liEl.hasClass('img-border-active')) {
                liEl.removeClass('img-border-active');
                liEl.style.removeProperty('border-color');
            }
        };
        this.clickGalleryImg = (event) => {
            const targetEl = event.target;
            if (!targetEl || 'IMG' !== targetEl.tagName)
                return;
            if (this.galleryListEl) {
                const liElList = this.galleryListEl.getElementsByClassName('gallery-active');
                for (let i = 0, len = liElList.length; i < len; i++) {
                    this.deactivateImage(liElList[i]);
                }
            }
            this.activateImage(targetEl.parentElement, targetEl);
        };
        /**
         * switch the image on the gallery navbar
         * @param next true: switch to the next image; false: switch to the previous image
         */
        this.switchImage = (next) => {
            if (!this.state || !this.galleryListEl)
                return;
            const liElList = this.galleryListEl.getElementsByTagName('li');
            if (!liElList || 0 >= liElList.length)
                return;
            let liEl;
            let toSwitchIdx = -1;
            for (let i = 0, len = liElList.length; i < len; i++) {
                if (!(liEl = liElList[i]))
                    continue;
                if (liEl.hasClass('gallery-active')) {
                    toSwitchIdx = next ? (len <= (i + 1) ? 0 : i + 1) : (0 == i ? len - 1 : i - 1);
                    this.deactivateImage(liEl);
                    break;
                }
            }
            if (0 >= toSwitchIdx) {
                toSwitchIdx = 0;
            }
            this.activateImage(liElList[toSwitchIdx]);
        };
        this.mouseDownGallery = (event) => {
            // console.log('mouse Down Gallery...');
            event.preventDefault();
            event.stopPropagation();
            this.mouseDownTime = new Date().getTime();
            this.galleryIsMousingDown = true;
            this.galleryMouseDownClientX = event.clientX;
        };
        this.mouseMoveGallery = (event) => {
            // console.log('mouse Move Gallery...');
            event.preventDefault();
            event.stopPropagation();
            if (!this.galleryIsMousingDown)
                return;
            let moveDistance = event.clientX - this.galleryMouseDownClientX;
            if (4 > Math.abs(moveDistance))
                return;
            this.galleryMouseDownClientX = event.clientX;
            this.galleryTranslateX += moveDistance;
            const windowWidth = this.mainContainerView.getDoc().documentElement.clientWidth || this.mainContainerView.getDoc().body.clientWidth;
            const imgLiWidth = (this.galleryListEl.childElementCount - 1) * 52;
            // console.log('move...', 'windowWidth=' + windowWidth, 'galleryTranslateX=' + galleryTranslateX, 'li count=' + imgInfo.galleryList.childElementCount);
            if (this.galleryTranslateX + 50 >= windowWidth)
                this.galleryTranslateX = windowWidth - 50;
            if (0 > this.galleryTranslateX + imgLiWidth)
                this.galleryTranslateX = -imgLiWidth;
            this.galleryListEl.style.transform = 'translateX(' + this.galleryTranslateX + 'px)';
        };
        this.mouseUpGallery = (event) => {
            // console.log('mouse Up Gallery>>>', event.target);
            event.preventDefault();
            event.stopPropagation();
            this.galleryIsMousingDown = false;
            if (!this.mouseDownTime || this.CLICK_TIME > new Date().getTime() - this.mouseDownTime) {
                this.clickGalleryImg(event);
            }
            this.mouseDownTime = null;
        };
        this.mouseLeaveGallery = (event) => {
            // console.log('mouse Leave Gallery>>>', event.target);
            event.preventDefault();
            event.stopPropagation();
            this.galleryIsMousingDown = false;
            this.mouseDownTime = null;
        };
        this.getGalleryImgCache = (file) => {
            if (!file)
                return null;
            const md5File = this.md5File(file.path, file.stat.ctime);
            if (!md5File)
                return null;
            const galleryImgCache = GalleryNavbarView.GALLERY_IMG_CACHE.get(md5File);
            if (galleryImgCache && file.stat.mtime !== galleryImgCache.file.mtime) {
                GalleryNavbarView.GALLERY_IMG_CACHE.delete(md5File);
                return null;
            }
            return galleryImgCache;
        };
        this.setGalleryImgCache = (galleryImg) => {
            const md5File = this.md5File(galleryImg.file.path, galleryImg.file.ctime);
            if (!md5File)
                return;
            this.trimGalleryImgCache();
            GalleryNavbarView.GALLERY_IMG_CACHE.set(md5File, galleryImg);
        };
        this.trimGalleryImgCache = () => {
            if (GalleryNavbarView.GALLERY_IMG_CACHE.size < this.CACHE_LIMIT)
                return;
            let earliestMtime, earliestKey;
            GalleryNavbarView.GALLERY_IMG_CACHE.forEach((value, key) => {
                if (!earliestMtime) {
                    earliestMtime = value.mtime;
                    earliestKey = key;
                }
                else {
                    if (earliestMtime > value.mtime) {
                        earliestMtime = value.mtime;
                        earliestKey = key;
                    }
                }
            });
            if (earliestKey) {
                GalleryNavbarView.GALLERY_IMG_CACHE.delete(earliestKey);
            }
        };
        this.md5File = (path, ctime) => {
            if (!path || !ctime)
                return;
            return Md5.init(path + '_' + ctime);
        };
        this.mainContainerView = mainContainerView;
        this.plugin = plugin;
        this.settings = plugin.settings;
    }
}
GalleryNavbarView.GALLERY_IMG_CACHE = new Map();

class NormalContainerView extends ContainerView {
    constructor(plugin) {
        super(plugin);
        //region ================== Container View ========================
        this.initContainerDom = (parentContainerEl) => {
            let imgCto;
            if (!this.imgInfo.oitContainerEl) {
                // init `oit-normal` dom at first time
                // <div class="oit oit-normal"> ... <div>
                (this.imgInfo.oitContainerEl = createDiv()).addClass(OIT_CLASS.CONTAINER_ROOT, OIT_CLASS.CONTAINER_NORMAL);
                parentContainerEl.appendChild(this.imgInfo.oitContainerEl);
                // 1. <div class="oit-img-container">...</div>
                this.imgInfo.oitContainerEl.append(this.imgInfo.imgContainerEl = createDiv(OIT_CLASS.IMG_CONTAINER));
                // 1.1. <div class="oit-img-container"> `<img class="oit-img-view" src="" alt="">` </div>
                this.updateImgViewElAndList(this.imgInfo);
                // 2. <div class="oit-img-tip"></div>
                this.imgInfo.oitContainerEl.appendChild(this.imgInfo.imgTipEl = createDiv(OIT_CLASS.IMG_TTP));
                this.imgInfo.imgTipEl.hidden = true;
                // 3. <div class="oit-img-footer"> ... <div>
                this.imgInfo.oitContainerEl.appendChild(this.imgInfo.imgFooterEl = createDiv(OIT_CLASS.IMG_FOOTER));
                // 3.1. <div class="oit-img-title"></div>
                this.imgInfo.imgFooterEl.appendChild(this.imgInfo.imgTitleEl = createDiv(OIT_CLASS.IMG_TITLE));
                // <span class="oit-img-title-name"></span>
                this.imgInfo.imgTitleEl.appendChild(this.imgInfo.imgTitleNameEl = createSpan(OIT_CLASS.IMG_TITLE_NAME));
                // <span class="oit-img-title-index"></span>
                this.imgInfo.imgTitleEl.appendChild(this.imgInfo.imgTitleIndexEl = createSpan(OIT_CLASS.IMG_TITLE_INDEX));
                // 3.2. <ul class="oit-img-toolbar">
                const imgToolbarUlEL = createEl('ul');
                imgToolbarUlEL.addClass(OIT_CLASS.IMG_TOOLBAR);
                this.imgInfo.imgFooterEl.appendChild(imgToolbarUlEL);
                let toolbarLi;
                for (const toolbar of TOOLBAR_CONF) {
                    if (!toolbar.enableToolbarIcon)
                        continue;
                    imgToolbarUlEL.appendChild(toolbarLi = createEl('li'));
                    toolbarLi.addClass(toolbar.class);
                    toolbarLi.setAttribute('alt', toolbar.title);
                    // @ts-ignore
                    toolbarLi.setAttribute('title', t(toolbar.title));
                }
                // add event: for oit-img-toolbar ul
                imgToolbarUlEL.addEventListener('click', this.clickImgToolbar);
                // <div class="img-player"> <img class='img-fullscreen' src=''> </div>
                this.imgInfo.oitContainerEl.appendChild(this.imgInfo.imgPlayerEl = createDiv(OIT_CLASS.IMG_PLAYER)); // img-player for full screen mode
                this.imgInfo.imgPlayerEl.appendChild(this.imgInfo.imgPlayerImgViewEl = createEl('img'));
                this.imgInfo.imgPlayerImgViewEl.addClass(OIT_CLASS.IMG_FULLSCREEN);
            }
            imgCto = this.imgInfo.imgList[0];
            this.imgGlobalStatus.activeImg = imgCto;
            return imgCto;
        };
        this.openOitContainerView = (matchedImg) => {
            if (!this.imgInfo.oitContainerEl) {
                console.error('obsidian-image-toolkit: oit-*-container-view has not been initialized!');
                return;
            }
            matchedImg.popup = true;
            this.imgGlobalStatus.popup = true;
            // display 'oit-normal'
            this.imgInfo.oitContainerEl.style.setProperty('display', 'block');
        };
        this.closeContainerView = (event, activeImg) => {
            if (event) {
                const target = event.target;
                if (!target || !(target.hasClass(OIT_CLASS.CONTAINER_ROOT) || target.hasClass(OIT_CLASS.IMG_CONTAINER)))
                    return;
            }
            if (!activeImg && !(activeImg = this.imgGlobalStatus.activeImg))
                return;
            if (this.imgInfo.oitContainerEl) {
                this.imgInfo.oitContainerEl.style.setProperty('display', 'none'); // hide 'oit-normal'
                this.renderImgTitle('', '');
                this.renderImgView(activeImg.imgViewEl, '', '');
                // remove events
                this.imgGlobalStatus.popup = false;
                activeImg.popup = false;
                activeImg.mtime = 0;
                this.addOrRemoveEvents(activeImg, false);
            }
            if (this.plugin.settings.galleryNavbarToggle && this.galleryNavbarView) {
                this.galleryNavbarView.closeGalleryNavbar();
            }
        };
        //endregion
        //region ================== Gallery Navbar ========================
        this.renderGalleryNavbar = () => {
            // <div class="gallery-navbar"> <ul class="gallery-list"> <li> <img src='' alt=''> </li> <li...> <ul> </div>
            if (!this.plugin.settings.galleryNavbarToggle)
                return;
            if (!this.galleryNavbarView) {
                this.galleryNavbarView = new GalleryNavbarView(this, this.plugin);
            }
            this.galleryNavbarView.renderGalleryImg(this.imgInfo.imgFooterEl);
        };
        this.removeGalleryNavbar = () => {
            if (!this.galleryNavbarView)
                return;
            this.galleryNavbarView.remove();
            this.galleryNavbarView = null;
        };
        //endregion
        this.renderImgTitle = (name, index) => {
            var _a, _b;
            if (undefined !== name && null !== name)
                (_a = this.imgInfo.imgTitleNameEl) === null || _a === void 0 ? void 0 : _a.setText(name);
            if (undefined !== index && null !== index)
                (_b = this.imgInfo.imgTitleIndexEl) === null || _b === void 0 ? void 0 : _b.setText(' ' + index);
        };
        this.switchImageOnGalleryNavBar = (event, next) => {
            var _a;
            if (!this.checkHotkeySettings(event, this.plugin.settings.switchTheImageHotkey))
                return;
            (_a = this.galleryNavbarView) === null || _a === void 0 ? void 0 : _a.switchImage(next);
        };
    }
    setActiveImgForMouseEvent(imgCto) {
    }
}

/**
 * Right click menu
 */
class MenuView {
    constructor(pinContainerView) {
        this.init = () => {
            if (this.menu)
                return;
            this.menu = new obsidian.Menu();
            for (const itemConf of TOOLBAR_CONF) {
                if (!itemConf.enableMenu)
                    continue;
                if (SEPARATOR_SYMBOL === itemConf.title) {
                    this.menu.addSeparator();
                    continue;
                }
                this.menu.addItem(item => {
                    if (itemConf.icon)
                        item.setIcon(itemConf.icon);
                    // @ts-ignore
                    item.setTitle(t(itemConf.title))
                        .onClick(() => {
                        this.pinContainerView.clickImgToolbar(null, itemConf.class, MenuView.activeImg);
                    });
                });
            }
        };
        this.show = (event, activeImg) => {
            MenuView.activeImg = activeImg;
            this.init();
            this.menu.showAtPosition({ x: event.clientX, y: event.clientY });
        };
        this.pinContainerView = pinContainerView;
    }
}

/**
 * PinContainerView: Pin an image on the top
 * @Support: move an image by mouse; close an image by Esc
 * @Nonsupport: move an image by keyboard; display gallery navbar
 */
class PinContainerView extends ContainerView {
    constructor(plugin /*, viewMode: ViewMode*/) {
        super(plugin /*, viewMode, plugin.settings.pinMaximum*/);
        //region ================== Container View ========================
        this.initContainerDom = (parentContainerEl) => {
            /*
            <div class="oit-pin-container-view">
              <div class="oit-img-container">
                <img class="oit-img-view" data-index='0' src="" alt="">
                <img class="oit-img-view" data-index='1' src="" alt="">
                ...
              </div>
            </div>
             */
            if (!this.imgInfo.oitContainerEl) { // init at first time
                // create: <div class="oit oit-pin">
                (this.imgInfo.oitContainerEl = createDiv()).addClass(OIT_CLASS.CONTAINER_ROOT, OIT_CLASS.CONTAINER_PIN);
                parentContainerEl.appendChild(this.imgInfo.oitContainerEl);
                // <div class="oit oit-pin"> <div class="oit-img-container"/> </div>
                this.imgInfo.oitContainerEl.append(this.imgInfo.imgContainerEl = createDiv(OIT_CLASS.IMG_CONTAINER));
                // <div class="oit-img-tip"></div>
                this.imgInfo.oitContainerEl.appendChild(this.imgInfo.imgTipEl = createDiv(OIT_CLASS.IMG_TTP)); // oit-img-tip
                this.imgInfo.imgTipEl.hidden = true; // hide 'oit-img-tip'
                // <div class="img-player"> <img class='img-fullscreen' src=''> </div>
                this.imgInfo.oitContainerEl.appendChild(this.imgInfo.imgPlayerEl = createDiv(OIT_CLASS.IMG_PLAYER)); // img-player for full screen mode
                this.imgInfo.imgPlayerEl.appendChild(this.imgInfo.imgPlayerImgViewEl = createEl('img'));
                this.imgInfo.imgPlayerImgViewEl.addClass(OIT_CLASS.IMG_FULLSCREEN);
            }
            // <div class="oit-img-container"> <img class="oit-img-view" src="" alt=""> </div>
            this.updateImgViewElAndList(this.imgInfo);
            return this.getMatchedImg();
        };
        this.openOitContainerView = (matchedImg) => {
            if (!this.imgInfo.oitContainerEl) {
                console.error('obsidian-image-toolkit: oit-*-container-view has not been initialized!');
                return;
            }
            matchedImg.popup = true;
            if (!this.imgGlobalStatus.popup) {
                this.imgGlobalStatus.popup = true;
                this.imgGlobalStatus.activeImgZIndex = 0;
                this.imgInfo.imgList.forEach(value => {
                    value.zIndex = 0;
                });
            }
            else {
                matchedImg.zIndex = (++this.imgGlobalStatus.activeImgZIndex);
            }
            matchedImg.imgViewEl.style.setProperty('z-index', matchedImg.zIndex + '');
            // display 'oit-pin-container-view'
            this.imgInfo.oitContainerEl.style.setProperty('display', 'block');
        };
        /**
         * hide container view
         * @param event not null: click event; null: keyboard event (Esc)
         * @param activeImg
         */
        this.closeContainerView = (event, activeImg) => {
            if (event && !activeImg) {
                // PinContainerView doesn't need click event to hide container for now
                return;
            }
            if (!this.imgInfo.oitContainerEl)
                return;
            if (!activeImg && !(activeImg = this.imgGlobalStatus.activeImg))
                return;
            // console.log('closeContainerView', event, activeImg)
            this.renderImgView(activeImg.imgViewEl, '', '');
            activeImg.popup = false;
            activeImg.mtime = 0;
            let globalPopupFlag = false;
            for (const imgCto of this.imgInfo.imgList) {
                if (imgCto.popup) {
                    globalPopupFlag = true;
                    break;
                }
            }
            if (!globalPopupFlag) {
                this.imgInfo.oitContainerEl.style.setProperty('display', 'none'); // hide 'oit-pin-container-view'
                this.imgGlobalStatus.activeImgZIndex = 0;
                this.imgInfo.imgList.forEach(value => {
                    value.zIndex = 0;
                });
            }
            this.imgGlobalStatus.popup = globalPopupFlag;
            this.addOrRemoveEvents(activeImg, false);
        };
        //endregion
        this.setActiveImgZIndex = (activeImg) => {
            var _a;
            let isUpdate = false;
            for (const imgCto of this.imgInfo.imgList) {
                if (activeImg.index !== imgCto.index && activeImg.zIndex <= imgCto.zIndex) {
                    isUpdate = true;
                    break;
                }
            }
            if (isUpdate) {
                activeImg.zIndex = (++this.imgGlobalStatus.activeImgZIndex);
                (_a = activeImg.imgViewEl) === null || _a === void 0 ? void 0 : _a.style.setProperty("z-index", activeImg.zIndex + '');
            }
        };
        this.setMenuView(new MenuView(this));
    }
    setActiveImgForMouseEvent(imgCto) {
        this.imgGlobalStatus.activeImg = imgCto;
    }
}

class ContainerFactory {
    constructor() {
        // popout window containers: hash -> ContainerView
        this.popoutContainers = new Map();
        this.setMainContainer = (container) => {
            this.mainContainer = container;
        };
        this.getMainContainer = () => {
            return this.mainContainer;
        };
        this.setPopoutContainer = (key, container) => {
            this.popoutContainers.set(key, container);
        };
        this.getPopoutContainer = (key) => {
            return this.popoutContainers.get(key);
        };
        this.getPopoutContainers = () => {
            return this.popoutContainers;
        };
        this.getContainer = (targetEl) => {
            const bodyEl = targetEl === null || targetEl === void 0 ? void 0 : targetEl.matchParent('body');
            if (!bodyEl)
                return null;
            const oitEventKey = bodyEl.getAttribute('data-oit-event');
            if (oitEventKey) {
                //popout window
                return this.getPopoutContainer(oitEventKey);
            }
            return this.mainContainer;
        };
        this.getAllContainers = () => {
            let allContainerViews = [this.mainContainer];
            for (let value of this.popoutContainers.values()) {
                allContainerViews.push(value);
            }
            return allContainerViews;
        };
        this.clearAll = () => {
            this.mainContainer = null;
            this.popoutContainers.clear();
        };
    }
}

class ImageToolkitPlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.containerFactory = new ContainerFactory();
        this.imgSelector = ``;
        this.addIcons = () => __awaiter(this, void 0, void 0, function* () {
            for (const icon of ICONS) {
                obsidian.addIcon(icon.id, icon.svg);
            }
        });
        this.getViewMode = () => {
            return this.settings.viewMode;
        };
        this.setViewMode = (viewMode) => {
            return this.settings.viewMode = viewMode;
        };
        this.checkViewMode = (viewMode) => __awaiter(this, void 0, void 0, function* () {
            for (const key in ViewMode) {
                if (key == viewMode) {
                    return;
                }
            }
            this.setViewMode(DEFAULT_VIEW_MODE);
            console.log('[oit] Reset view mode: %s', DEFAULT_VIEW_MODE);
            yield this.saveSettings();
        });
        this.getAllContainerViews = () => {
            return this.containerFactory.getAllContainers();
        };
        this.initContainer = (viewMode, popoutWindowEventId) => __awaiter(this, void 0, void 0, function* () {
            const container = yield this.initContainerByViewMode(viewMode);
            if (!container) {
                console.error('[oit] Cannot init container');
                return;
            }
            if (popoutWindowEventId) {
                // popoutWindowEventId will be recorded into data-oit-event'of body tag
                this.containerFactory.setPopoutContainer(popoutWindowEventId, container);
            }
            else {
                this.containerFactory.setMainContainer(container);
            }
        });
        this.initContainerByViewMode = (viewMode, fromDefault) => __awaiter(this, void 0, void 0, function* () {
            switch (viewMode) {
                case ViewMode.Normal:
                    return new NormalContainerView(this);
                case ViewMode.Pin:
                    return new PinContainerView(this);
                default:
                    if (fromDefault) {
                        return null;
                    }
                    this.setViewMode(viewMode = DEFAULT_VIEW_MODE);
                    yield this.saveSettings();
                    console.log('[oit] Reset view mode to: %s', viewMode);
                    return this.initContainerByViewMode(viewMode, true);
            }
        });
        this.isImageElement = (imgEl) => {
            return imgEl && 'IMG' === imgEl.tagName;
        };
        this.isClickable = (targetEl, event) => {
            let container;
            if (this.isImageElement(targetEl)
                && (container = this.containerFactory.getContainer(targetEl))
                && container.checkHotkeySettings(event, this.settings.viewTriggerHotkey)) {
                return container;
            }
            return null;
        };
        this.switchViewMode = (viewMode) => __awaiter(this, void 0, void 0, function* () {
            this.settings.viewMode = viewMode;
            yield this.saveSettings();
            this.getAllContainerViews().forEach(container => {
                var _a;
                container.removeOitContainerView();
                this.initContainer(viewMode, (_a = container.getParentContainerEl()) === null || _a === void 0 ? void 0 : _a.getAttribute('data-oit-event'));
            });
        });
        /**
         * refresh events for main container
         */
        this.refreshViewTrigger = (doc) => {
            // .workspace-leaf-content[data-type='markdown'] img,.workspace-leaf-content[data-type='image'] img
            const viewImageInEditor = this.settings.viewImageInEditor;
            // .community-modal-details img
            const viewImageInCPB = this.settings.viewImageInCPB;
            // false: ... img:not(a img)
            const viewImageWithLink = this.settings.viewImageWithLink;
            // #sr-flashcard-view img
            const viewImageOther = this.settings.viewImageOther;
            if (!doc) {
                doc = document;
            }
            if (this.imgSelector) {
                doc.off('click', this.imgSelector, this.clickImage);
                doc.off('mouseover', this.imgSelector, this.mouseoverImg);
                doc.off('mouseout', this.imgSelector, this.mouseoutImg);
            }
            if (!viewImageOther && !viewImageInEditor && !viewImageInCPB && !viewImageWithLink) {
                return;
            }
            let selector = ``;
            if (viewImageInEditor) {
                selector += (viewImageWithLink ? VIEW_IMG_SELECTOR.EDITOR_AREAS : VIEW_IMG_SELECTOR.EDITOR_AREAS_NO_LINK);
            }
            if (viewImageInCPB) {
                selector += (1 < selector.length ? `,` : ``) + (viewImageWithLink ? VIEW_IMG_SELECTOR.CPB : VIEW_IMG_SELECTOR.CPB_NO_LINK);
            }
            if (viewImageOther) {
                selector += (1 < selector.length ? `,` : ``) + (viewImageWithLink ? VIEW_IMG_SELECTOR.OTHER : VIEW_IMG_SELECTOR.OTHER_NO_LINK);
            }
            if (selector) {
                this.imgSelector = selector;
                // doc.onclick = (event: MouseEvent) =>{
                //     console.log(event.target);
                // }
                doc.on('click', this.imgSelector, this.clickImage);
                doc.on('mouseover', this.imgSelector, this.mouseoverImg);
                doc.on('mouseout', this.imgSelector, this.mouseoutImg);
            }
        };
        this.clickImage = (event) => {
            const targetEl = event.target;
            let container = this.isClickable(targetEl, event);
            if (container) {
                container.renderContainer(targetEl);
            }
        };
        this.mouseoverImg = (event) => {
            const targetEl = event.target;
            if (!this.isClickable(targetEl, event)) {
                return;
            }
            if (null == targetEl.getAttribute(ImageToolkitPlugin.IMG_ORIGIN_CURSOR)) {
                targetEl.setAttribute(ImageToolkitPlugin.IMG_ORIGIN_CURSOR, targetEl.style.cursor || '');
            }
            targetEl.style.cursor = 'zoom-in';
        };
        this.mouseoutImg = (event) => {
            const targetEl = event.target;
            if (!this.isClickable(targetEl, event)) {
                return;
            }
            targetEl.style.cursor = targetEl.getAttribute(ImageToolkitPlugin.IMG_ORIGIN_CURSOR);
        };
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('loading %s plugin v%s ...', this.manifest.id, this.manifest.version);
            yield this.loadSettings();
            this.addSettingTab(new ImageToolkitSettingTab(this.app, this));
            // this.registerCommands();
            yield this.initContainer(this.settings.viewMode);
            this.refreshViewTrigger();
            // addEventListener for opened new windows
            this.app.workspace.on('layout-change', () => {
                this.app.workspace.iterateAllLeaves((leaf) => {
                    var _a;
                    if (['markdown', 'image'].includes((_a = leaf.getViewState()) === null || _a === void 0 ? void 0 : _a.type)) {
                        const bodyEl = leaf.view.containerEl.matchParent('body');
                        if (bodyEl === null || bodyEl === void 0 ? void 0 : bodyEl.hasClass('is-popout-window')) {
                            if (!bodyEl.hasAttribute(ImageToolkitPlugin.POPOUT_WINDOW_EVENT)) {
                                console.log('popout leaf:', leaf, leaf.getDisplayText());
                                const eventId = crypto.randomUUID();
                                this.initContainer(this.settings.viewMode, eventId);
                                bodyEl.setAttr(ImageToolkitPlugin.POPOUT_WINDOW_EVENT, eventId);
                                this.refreshViewTrigger(bodyEl.ownerDocument);
                            }
                        }
                    }
                });
            });
        });
    }
    onunload() {
        console.log('unloading ' + this.manifest.id + ' plugin...');
        this.getAllContainerViews().forEach(container => {
            container.removeOitContainerView();
        });
        this.containerFactory.clearAll();
        document.off('click', this.imgSelector, this.clickImage);
        document.off('mouseover', this.imgSelector, this.mouseoverImg);
        document.off('mouseout', this.imgSelector, this.mouseoutImg);
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
            yield this.checkViewMode(this.getViewMode());
            yield this.addIcons();
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
    registerCommands() {
        return __awaiter(this, void 0, void 0, function* () {
            /* this.addCommand({
                "id": "oit-move-up-image",
                "name": "move up the image",
                hotkeys: [{ modifiers: ["Ctrl"], key: "ArrowUp" }],
                checkCallback: (checking: boolean) => {
                    if (checking) return false;
                    this.containerView.moveImgViewByHotkey('UP');
                },
            }); */
        });
    }
}
ImageToolkitPlugin.IMG_ORIGIN_CURSOR = 'data-oit-origin-cursor';
// data-oit-event: 标识new window是否已addEventListener for click
ImageToolkitPlugin.POPOUT_WINDOW_EVENT = 'data-oit-event';

module.exports = ImageToolkitPlugin;


/* nosourcemap */