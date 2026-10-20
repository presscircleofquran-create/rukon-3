// ============================================================
//  Word-style note editor (contenteditable). Used by admin.html
//  Only features that really work are shown. Not supported (honest list):
//  track changes, comments, sharing/permissions, section breaks, spell-check dictionaries of our own
//  (the browser's own spell checker is used), page-break preview.
// ============================================================
import { cleanHtml, esc } from './islamic.js';

const BLOCKS = 'p,div,li,h1,h2,h3,h4,blockquote';
const FONTS = [['Hind Siliguri', 'হিন্দ সিলিগুড়ি'], ['Noto Serif Bengali', 'নোটো সেরিফ বাংলা'], ['Tiro Bangla', 'তিরো বাংলা'], ['Amiri', 'Amiri (আরবি)'], ['Amiri Quran', 'Amiri Quran'],
  ['Arial', 'Arial'], ['Times New Roman', 'Times New Roman'], ['Georgia', 'Georgia'], ['Verdana', 'Verdana'], ['Courier New', 'Courier New']];
const SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];
const SW = ['#0F5A46', '#C64756', '#B8860B', '#1F5FA8', '#6B7280', '#111827'];
const SPECIAL = {
  'আরবি চিহ্ন': ['ﷺ', 'ﷻ', '﴾', '﴿', '،', '؛', '؟', 'ـ', 'َ', 'ُ', 'ِ', 'ّ', 'ْ', 'ً', 'ٌ', 'ٍ', 'ٰ', 'ۖ', 'ۗ', 'ۚ', 'ۛ', 'ۘ', '۞', '۝'],
  'বিরামচিহ্ন': ['।', '॥', '“', '”', '‘', '’', '«', '»', '…', '–', '—', '•', '·', '§', '¶', '†', '‡', '©', '®', '™', '※'],
  'গণিত': ['±', '×', '÷', '≠', '≈', '≤', '≥', '<', '>', '∞', '√', '∑', '∏', '∫', 'π', '°', '′', '″', '²', '³', '⁴', 'ⁿ', '½', '¼', '¾', '⅓', '∴', '∵', '∈', '∅', '∪', '∩', '⊂', 'α', 'β', 'γ', 'Δ', 'θ', 'λ', 'μ', 'Ω'],
  'সাব/সুপার': ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', '⁰', '¹', '⁺', '⁻', '⁼', '₊', '₋'],
  'মুদ্রা ও তীর': ['৳', '$', '€', '£', '¥', '₹', '←', '→', '↑', '↓', '↔', '⇒', '⇔', '✓', '✗', '★', '☆', '✦', '❖', '◆', '■', '□', '●', '○']
};
const FORMULAS = ['a² + b² = c²', 'x = (−b ± √(b² − 4ac)) / 2a', 'E = mc²', 'H₂O', 'CO₂', '(a + b)² = a² + 2ab + b²', 'ক ÷ খ = গ', 'π ≈ ৩.১৪১৫৯', '১/২ + ১/৪ = ৩/৪', 'যাকাত = সম্পদ × ২.৫%'];
const TEMPLATES = {
  'আবেদনপত্র': '<p>তারিখ: ........</p><p>বরাবর,<br>........<br>........</p><p><b>বিষয়: ........ এর জন্য আবেদন।</b></p><p>জনাব,</p><p>সবিনয় নিবেদন এই যে, ........</p><p>অতএব, মহোদয়ের নিকট বিনীত প্রার্থনা, ........</p><p>বিনীত নিবেদক,<br>........<br>মোবাইল: ........</p>',
  'অফিসিয়াল চিঠি': '<p style="text-align:center"><b>........ (প্রতিষ্ঠানের নাম)</b></p><p style="text-align:center">ঠিকানা: ........ | ফোন: ........</p><hr><p>স্মারক নং: ........ &nbsp;&nbsp;&nbsp; তারিখ: ........</p><p>প্রতি,<br>........</p><p><b>বিষয়: ........</b></p><p>সূত্র: ........</p><p>........</p><p>ধন্যবাদান্তে,<br>........<br>পদবি</p>',
  'নোট': '<h1>নোটের শিরোনাম</h1><p class="doc-sub">উপশিরোনাম</p><h2>মূল পয়েন্ট</h2><ul><li>প্রথম পয়েন্ট</li><li>দ্বিতীয় পয়েন্ট</li></ul><h2>বিস্তারিত</h2><p>........</p>',
  'প্রতিবেদন': '<h1>প্রতিবেদন</h1><p class="doc-sub">তারিখ: ........ | প্রস্তুতকারী: ........</p><h2>১. ভূমিকা</h2><p>........</p><h2>২. কার্যক্রম</h2><p>........</p><h2>৩. ফলাফল</h2><table><tbody><tr><th>বিষয়</th><th>সংখ্যা</th><th>মন্তব্য</th></tr><tr><td><br></td><td><br></td><td><br></td></tr></tbody></table><h2>৪. সুপারিশ</h2><p>........</p>'
};
const PAGE = { A4: 'A4', A5: 'A5', Letter: 'letter', Legal: 'legal' };

const opt = (arr) => arr.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
const btn = (a, ic, t, lbl = '', cls = '') => `<button type="button" class="${cls}" data-a="${a}" title="${esc(t)}" aria-label="${esc(t)}">${ic ? `<i class="fa-solid fa-${ic}"></i>` : ''}${lbl ? `<span>${lbl}</span>` : ''}</button>`;
const grp = (t, inner) => `<div class="ed-grp" role="group" aria-label="${esc(t)}">${inner}</div>`;

const TAB_HOME = [
  grp('আনডু', btn('undo', 'rotate-left', 'আনডু (Ctrl+Z)') + btn('redo', 'rotate-right', 'রিডু (Ctrl+Y)') + btn('painter', 'paintbrush', 'ফরম্যাট পেইন্টার: আগে লেখা সিলেক্ট করে এটা চাপুন, তারপর অন্য লেখা সিলেক্ট করুন', 'পেইন্টার')),
  grp('স্টাইল', `<select data-s="block" title="শিরোনাম / স্টাইল"><option value="p">সাধারণ লেখা</option><option value="title">ডকুমেন্ট টাইটেল</option><option value="subtitle">সাবটাইটেল</option><option value="h1">প্রধান শিরোনাম (সূচিপত্রে বড়)</option><option value="h2">উপ-শিরোনাম (সূচিপত্রে ছোট)</option><option value="h3">হেডিং ৩</option><option value="quote">উদ্ধৃতি</option></select>` +
    `<select data-s="font" title="ফন্ট"><option value="">ফন্ট</option>${opt(FONTS)}</select>` +
    `<input type="number" data-s="size" class="ed-num" min="6" max="200" list="edSizes" placeholder="সাইজ" title="লেখার সাইজ (px)"><datalist id="edSizes">${SIZES.map(s => `<option value="${s}">`).join('')}</datalist>`),
  grp('অক্ষর', btn('bold', '', 'বোল্ড (Ctrl+B)', '<b>B</b>', 'tx') + btn('italic', '', 'ইটালিক (Ctrl+I)', '<i>I</i>', 'tx') + btn('underline', '', 'আন্ডারলাইন (Ctrl+U)', '<u>U</u>', 'tx') + btn('strikeThrough', '', 'কাটা দাগ', '<s>S</s>', 'tx') +
    btn('superscript', '', 'সুপারস্ক্রিপ্ট (X²)', 'x<sup>2</sup>', 'tx') + btn('subscript', '', 'সাবস্ক্রিপ্ট (H₂O)', 'x<sub>2</sub>', 'tx')),
  grp('রং', `<label class="ed-color" title="লেখার রং" style="--c:#0F5A46"><span class="tx"><b>A</b></span><input type="color" data-color="foreColor" value="#0F5A46" aria-label="লেখার রং"></label><label class="ed-color" title="হাইলাইট" style="--c:#FFE066"><span class="tx">H</span><input type="color" data-color="hiliteColor" value="#FFE066" aria-label="হাইলাইট রং"></label>` +
    SW.map(c => `<button type="button" class="sw" data-sw="${c}" style="--sw:${c}" title="${c}" aria-label="রং ${c}"></button>`).join('') +
    `<select data-s="case" title="অক্ষরের ধরন (ইংরেজি)"><option value="">Aa</option><option value="lower">abc ছোট হাতের</option><option value="upper">ABC বড় হাতের</option><option value="title">Title Case</option></select>` + btn('clear', 'eraser', 'ফরম্যাট মুছুন', 'মুছুন')),
  grp('সাজানো', btn('justifyLeft', 'align-left', 'বামে') + btn('justifyCenter', 'align-center', 'মাঝে') + btn('justifyRight', 'align-right', 'ডানে') + btn('justifyFull', 'align-justify', 'দুই পাশ সমান') + btn('ltr', '', 'বাম থেকে ডান', 'LTR', 'tx') + btn('rtl', '', 'ডান থেকে বাম (আরবি)', '<b style="font-family:Amiri,serif">ع RTL</b>', 'tx')),
  grp('প্যারাগ্রাফ', `<select data-s="lh" title="লাইনের দূরত্ব"><option value="">লাইন দূরত্ব</option><option>1</option><option>1.15</option><option>1.5</option><option>1.8</option><option>2</option><option>2.5</option></select>` +
    `<select data-s="before" title="প্যারাগ্রাফের আগে ফাঁকা"><option value="">আগে</option><option>0</option><option>6</option><option>12</option><option>18</option><option>24</option></select>` +
    `<select data-s="after" title="প্যারাগ্রাফের পরে ফাঁকা"><option value="">পরে</option><option>0</option><option>6</option><option>12</option><option>18</option><option>24</option></select>` +
    btn('outdent', 'outdent', 'ভেতর থেকে বের (ইন্ডেন্ট কমান)') + btn('indent', 'indent', 'ভেতরে সরান (ইন্ডেন্ট বাড়ান)')),
  grp('তালিকা', btn('ul', 'list-ul', 'বুলেট তালিকা') + `<select data-s="ultype" title="বুলেটের ধরন"><option value="">✦ ডিফল্ট</option><option value="disc">● গোল</option><option value="circle">○ ফাঁকা গোল</option><option value="square">■ চৌকো</option></select>` +
    btn('ol', 'list-ol', 'নম্বর তালিকা') + `<select data-s="oltype" title="নম্বরের ধরন"><option value="">১, ২, ৩ (ডিফল্ট)</option><option value="decimal">1, 2, 3</option><option value="bengali">১, ২, ৩</option><option value="upper-alpha">A, B, C</option><option value="lower-alpha">a, b, c</option><option value="upper-roman">I, II, III</option><option value="lower-roman">i, ii, iii</option></select>` +
    '<span class="ed-note">একাধিক স্তর: তালিকার ভেতরে "ভেতরে সরান" চাপুন</span>'),
  grp('বর্ডার', btn('pborder', 'border-all', 'প্যারাগ্রাফের বর্ডার', 'বর্ডার') + `<label class="ed-color" title="প্যারাগ্রাফের ব্যাকগ্রাউন্ড" style="--c:#F6E4B0"><span class="tx">▦</span><input type="color" data-color="pbg" value="#F6E4B0" aria-label="প্যারাগ্রাফ ব্যাকগ্রাউন্ড"></label>` + btn('pbgclear', '', 'ব্যাকগ্রাউন্ড সরান', '✕ ব্যাকগ্রাউন্ড') + btn('marks', 'paragraph', 'ফরম্যাটিং চিহ্ন (¶) দেখান/লুকান', '¶'))
].join('');

const TAB_INSERT = [
  grp('টেবিল', btn('p-table', 'table', 'টেবিল ঢোকান', 'টেবিল') + btn('t-rowa', '', 'নিচে সারি যোগ', '+সারি↓', 'tx') + btn('t-rowb', '', 'উপরে সারি যোগ', '+সারি↑', 'tx') + btn('t-cola', '', 'ডানে কলাম যোগ', '+কলাম→', 'tx') + btn('t-colb', '', 'বামে কলাম যোগ', '+কলাম←', 'tx') +
    btn('t-rowd', '', 'সারি মুছুন', '−সারি', 'tx') + btn('t-cold', '', 'কলাম মুছুন', '−কলাম', 'tx') + btn('t-merge', '', 'ডানের সেলের সাথে মার্জ', 'মার্জ', 'tx') + btn('t-split', '', 'মার্জ করা সেল ভাগ', 'ভাগ', 'tx') + btn('t-head', '', 'প্রথম সারি হেডার', 'হেডার', 'tx') + btn('t-border', '', 'টেবিলের বর্ডার চালু/বন্ধ', 'বর্ডার', 'tx') +
    `<select data-s="tcellalign" title="সেলের লেখা"><option value="">সেল সাজানো</option><option value="left">বামে</option><option value="center">মাঝে</option><option value="right">ডানে</option></select><select data-s="tpad" title="সেলের প্যাডিং"><option value="">প্যাডিং</option><option>2</option><option>6</option><option>10</option><option>16</option><option>24</option></select>` + btn('t-del', 'trash', 'পুরো টেবিল মুছুন', 'টেবিল মুছুন', 'tx')),
  grp('ছবি', btn('img', 'image', 'কম্পিউটার থেকে ছবি যোগ করুন', 'ছবি') + `<select data-s="imgw" title="ছবির আকার (অনুপাত ঠিক থাকে)"><option value="">ছবির আকার</option><option value="25%">২৫%</option><option value="50%">৫০%</option><option value="75%">৭৫%</option><option value="100%">১০০%</option></select><input type="number" data-s="imgpx" class="ed-num" min="20" max="1200" placeholder="px" title="ছবির প্রস্থ px">` +
    btn('i-left', 'align-left', 'ছবি বামে') + btn('i-center', 'align-center', 'ছবি মাঝে') + btn('i-right', 'align-right', 'ছবি ডানে') + btn('i-wl', '', 'ছবি বামে, লেখা ডানে ঘিরে', 'লেখা ডানে', 'tx') + btn('i-wr', '', 'ছবি ডানে, লেখা বামে ঘিরে', 'লেখা বামে', 'tx') + btn('i-wn', '', 'লেখা শুধু ছবির ওপরে-নিচে', 'ওপরে-নিচে', 'tx') + btn('i-del', 'trash', 'ছবি মুছুন', '', '')),
  grp('লিংক', btn('link', 'link', 'লিংক যোগ / বদল (Ctrl+K)', 'লিংক') + btn('unlink', 'link-slash', 'লিংক সরান', 'সরান')),
  grp('ঢোকান', btn('p-special', 'omega', 'বিশেষ চিহ্ন ও আরবি হরকত', 'বিশেষ চিহ্ন') + btn('p-formula', 'square-root-variable', 'গাণিতিক সূত্র ও প্রতীক', 'সূত্র') + btn('hr', 'minus', 'আলাদা দাগ', 'দাগ') + btn('date', 'calendar', 'আজকের তারিখ ও সময়', 'তারিখ') + btn('footnote', 'asterisk', 'পাদটীকা', 'পাদটীকা') + btn('pgbreak', 'file', 'নতুন পৃষ্ঠার বিরতি (প্রিন্ট/PDF-এ কাজ করে)', 'পৃষ্ঠা বিরতি') + btn('quote', 'quote-left', 'উদ্ধৃতি', 'উদ্ধৃতি')),
  grp('সূচিপত্র', btn('toc', 'list', 'হেডিং থেকে সূচিপত্র বানান / আপডেট করুন', 'সূচিপত্র') + btn('p-nav', 'compass', 'নেভিগেশন (হেডিং-এর তালিকা)', 'নেভিগেশন'))
].join('');

const TAB_LAYOUT = `<div class="ed-lay">
  <label>পেজ সাইজ<select data-l="size">${opt(Object.keys(PAGE).map(k => [k, k]))}</select></label>
  <label>দিক<select data-l="orient"><option value="portrait">লম্বালম্বি (Portrait)</option><option value="landscape">আড়াআড়ি (Landscape)</option></select></label>
  <label>মার্জিন<select data-l="margin"><option value="10">সরু (১০ মিমি)</option><option value="20">সাধারণ (২০ মিমি)</option><option value="30">চওড়া (৩০ মিমি)</option></select></label>
  <label>হেডার লেখা<input type="text" data-l="header" maxlength="80" placeholder="প্রতি পৃষ্ঠার ওপরে"></label>
  <label>ফুটার লেখা<input type="text" data-l="footer" maxlength="80" placeholder="প্রতি পৃষ্ঠার নিচে"></label>
  <label class="chk"><input type="checkbox" data-l="pageNo"> পৃষ্ঠা নম্বর</label>
  <label class="chk"><input type="checkbox" data-l="border"> পৃষ্ঠার বর্ডার</label>
  <span class="ed-note">পেজ সেটিং প্রিন্ট ও PDF-এ কাজ করে। সাইটে নোট স্ক্রলিং পাতায় দেখায়।</span>
</div>`;

const TAB_TOOLS = [
  grp('খোঁজা', btn('p-find', 'magnifying-glass', 'খুঁজুন ও বদলান (Ctrl+F)', 'খুঁজুন / বদলান') + btn('p-count', 'hashtag', 'শব্দ, অক্ষর ও প্যারাগ্রাফের হিসাব', 'শব্দ গণনা')),
  grp('বানান', btn('spell', 'spell-check', 'বানান পরীক্ষা চালু/বন্ধ (ব্রাউজারের অভিধান ব্যবহার হয়)', 'বানান পরীক্ষা') + `<select data-s="lang" title="লেখার ভাষা"><option value="bn">বাংলা</option><option value="en">English</option><option value="ar">العربية</option></select>`),
  grp('দেখা', btn('p-nav', 'compass', 'নেভিগেশন', 'নেভিগেশন') + btn('marks', 'paragraph', 'ফরম্যাটিং চিহ্ন', '¶ চিহ্ন') + btn('ro', 'lock', 'শুধু পড়ার মোড', 'শুধু পড়া') + btn('full', 'expand', 'বড় পর্দায় এডিট', 'ফুলস্ক্রিন')),
  grp('প্রিন্ট', btn('preview', 'eye', 'প্রিন্ট প্রিভিউ', 'প্রিন্ট প্রিভিউ') + btn('print', 'print', 'প্রিন্ট', 'প্রিন্ট')),
  grp('ইতিহাস', btn('p-ver', 'clock-rotate-left', 'আগের সংরক্ষিত সংস্করণ দেখুন ও ফিরিয়ে আনুন', 'সংস্করণ') + btn('p-style', 'wand-magic-sparkles', 'নিজের স্টাইল সংরক্ষণ ও প্রয়োগ', 'নিজের স্টাইল'))
].join('');

const TAB_FILE = [
  grp('ডকুমেন্ট', btn('new', 'file-circle-plus', 'নতুন ফাঁকা ডকুমেন্ট', 'নতুন') + btn('save', 'floppy-disk', 'সংরক্ষণ (Ctrl+S)', 'সংরক্ষণ') + `<select data-s="tpl" title="টেমপ্লেট"><option value="">টেমপ্লেট</option>${opt(Object.keys(TEMPLATES).map(k => [k, k]))}</select>`),
  grp('এক্সপোর্ট', btn('pdf', 'file-pdf', 'PDF (প্রিন্ট উইন্ডোতে "PDF হিসেবে সেভ" বেছে নিন)', 'PDF') + btn('docx', 'file-word', 'Word (.docx)', 'DOCX') + btn('doc', 'file-word', 'Word-এ খোলা যায় (.doc)', 'DOC') + btn('txt', 'file-lines', 'সাধারণ টেক্সট (.txt)', 'TXT')),
  grp('ইমপোর্ট', btn('import', 'file-import', 'Word (.docx) ফাইল থেকে লেখা আনুন', 'DOCX ইমপোর্ট'))
].join('');

const CSS_PRINT = `body{font-family:'Noto Serif Bengali','Hind Siliguri','Amiri',serif;font-size:13pt;line-height:1.8;color:#111;margin:0}
h1{font-size:1.7em;text-align:center}h2{font-size:1.4em;border-bottom:2px solid #c9a24a}h3{font-size:1.2em}h4{font-size:1.05em}p,div{margin:0 0 .5em}
table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #777;padding:5px 9px;vertical-align:top}th{background:#f3e8c6}table[data-b="0"] td,table[data-b="0"] th{border-color:transparent}
img{max-width:100%;height:auto}[dir=rtl]{font-family:'Amiri',serif;font-size:1.3em;line-height:2.1}blockquote{margin:.8em 0;padding:.4em 1em;border-left:4px solid #c9a24a;background:#faf3dc}
.doc-sub{text-align:center;opacity:.8}.pgbreak{border:0;height:0;page-break-after:always;margin:0}.toc{border:1px dashed #999;padding:.4em 1em}.toc a{color:inherit;text-decoration:none}.fn-list{border-top:1px solid #999;font-size:.85em;margin-top:1.4em}
hr:not(.pgbreak){border:0;border-top:1px solid #999;margin:1em 0}`;

export function createEditor(host, { placeholder = 'এখানে লেখা বা নোট লিখুন...', minHeight = 220, toast = () => {}, key = 'new', onSave = null } = {}) {
  host.classList.add('ed');
  const uid = 'ed' + Math.random().toString(36).slice(2, 7);
  host.innerHTML = `<div class="ed-banner" hidden></div>
  <div class="ed-tabs" role="tablist" aria-label="এডিটরের মেনু">${[['home', 'হোম'], ['insert', 'ঢোকান'], ['layout', 'পেজ লেআউট'], ['tools', 'টুলস'], ['file', 'ফাইল']].map(([k, l], i) => `<button type="button" role="tab" class="${i ? '' : 'on'}" data-tab="${k}" aria-selected="${!i}">${l}</button>`).join('')}</div>
  <div class="ed-bar" role="toolbar" aria-label="লেখার টুলবার">
    <div class="ed-tp on" data-tp="home">${TAB_HOME}</div><div class="ed-tp" data-tp="insert">${TAB_INSERT}</div><div class="ed-tp" data-tp="layout">${TAB_LAYOUT}</div><div class="ed-tp" data-tp="tools">${TAB_TOOLS}</div><div class="ed-tp" data-tp="file">${TAB_FILE}</div>
  </div>
  <div class="ed-panel" hidden></div>
  <div class="ed-body"><div class="ed-area isl-rich is-empty" contenteditable="true" spellcheck="false" lang="bn" role="textbox" aria-multiline="true" aria-label="নোটের লেখা" data-ph="${esc(placeholder)}" style="min-height:${minHeight}px"></div></div>
  <div class="ed-status"><span class="st-count"></span><span class="st-save"></span></div>
  <input type="file" accept="image/*" hidden data-file="img"><input type="file" accept=".docx" hidden data-file="docx">`;
  const $q = (s) => host.querySelector(s);
  const area = $q('.ed-area'), panel = $q('.ed-panel'), banner = $q('.ed-banner');
  let saved = null, selImg = null, painter = null, pendingPx = 0, dirty = false, baseHtml = '', matches = [], mi = -1, curKey = key, ro = false, plainNext = false;
  let layout = { size: 'A4', orient: 'portrait', margin: '20', header: '', footer: '', pageNo: true, border: false };
  try { layout = Object.assign(layout, JSON.parse(localStorage.getItem('ed_layout') || '{}')); } catch (e) { /* ignore */ }
  const saveLayout = () => { try { localStorage.setItem('ed_layout', JSON.stringify(layout)); } catch (e) { /* ignore */ } };
  host.querySelectorAll('[data-l]').forEach(i => { const k = i.dataset.l; if (i.type === 'checkbox') i.checked = !!layout[k]; else i.value = layout[k]; });

  const inArea = (n) => !!n && area.contains(n.nodeType === 3 ? n.parentNode : n);
  const saveSel = () => { const s = getSelection(); if (s.rangeCount && inArea(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
  const restoreSel = () => { area.focus({ preventScroll: true }); if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); } };
  const hasContent = () => area.textContent.trim() !== '' || !!area.querySelector('hr,ul,ol,table,img');
  const syncEmpty = () => { area.classList.toggle('is-empty', !hasContent()); dirty = true; counts(); };
  const nodeEl = (n) => (n && n.nodeType === 3 ? n.parentNode : n);
  const curEl = () => { const r = saved; return r ? nodeEl(r.startContainer) : null; };
  const closest = (sel) => { const e = curEl(); return e && area.contains(e) ? e.closest(sel) : null; };

  function counts() {
    const t = (area.innerText || '').trim(), w = t ? t.split(/\s+/).length : 0;
    $q('.st-count').textContent = 'শব্দ: ' + w + ' · অক্ষর: ' + t.replace(/\s/g, '').length;
  }
  const exec = (cmd, val = null) => {
    restoreSel(); document.execCommand('styleWithCSS', false, true); document.execCommand('defaultParagraphSeparator', false, 'p');
    const ok = document.execCommand(cmd, false, val); saveSel(); refresh(); syncEmpty(); return ok;
  };
  const html = (h) => exec('insertHTML', h);
  const text = (t) => exec('insertText', t);

  function blocksInSel() {
    restoreSel(); const sel = getSelection(); if (!sel.rangeCount) return [];
    if (!area.querySelector(BLOCKS)) document.execCommand('formatBlock', false, '<p>');
    const pick = () => { const r = getSelection().getRangeAt(0); return [...area.querySelectorAll(BLOCKS)].filter(el => r.intersectsNode(el) && !el.querySelector(BLOCKS)); };
    let b = pick(); if (!b.length) { document.execCommand('formatBlock', false, '<p>'); b = pick(); }
    return b;
  }
  const eachBlock = (fn) => { const b = blocksInSel(); b.forEach(fn); saveSel(); syncEmpty(); return b; };

  const STATE = ['bold', 'italic', 'underline', 'strikeThrough', 'superscript', 'subscript', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
  function refresh() {
    if (!inArea(getSelection().anchorNode)) return;
    STATE.forEach(c => { const b = host.querySelector(`.ed-bar [data-a="${c}"]`); if (!b) return; let on = false; try { on = document.queryCommandState(c); } catch (e) { /* ignore */ } b.classList.toggle('on', on); });
    let blk = ''; try { blk = (document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, ''); } catch (e) { /* ignore */ }
    const el = closest('p,div,h1,h2,h3,h4,blockquote'), sel = $q('[data-s=block]');
    sel.value = blk === 'h1' ? 'title' : ['h2', 'h3', 'h4'].includes(blk) ? 'h' + (+blk[1] - 1) : blk === 'blockquote' ? 'quote' : (el && el.classList.contains('doc-sub')) ? 'subtitle' : 'p';
  }

  /* ---------- text ---------- */
  function setSize(px) {
    restoreSel(); const sel = getSelection(); if (!sel.rangeCount) return;
    document.execCommand('styleWithCSS', false, false); document.execCommand('fontSize', false, '7'); document.execCommand('styleWithCSS', false, true);
    if (sel.isCollapsed) { pendingPx = px; return; }
    fixFonts(px); saveSel(); syncEmpty();
  }
  function fixFonts(px) {
    const fs = [...area.querySelectorAll('font[size="7"]')]; if (!fs.length) return;
    const made = fs.map(f => { const sp = document.createElement('span'); sp.style.fontSize = px + 'px'; while (f.firstChild) sp.appendChild(f.firstChild); f.replaceWith(sp); sp.querySelectorAll('[style*="font-size"]').forEach(e => { e.style.fontSize = ''; }); return sp; });
    const r = document.createRange(); r.setStartBefore(made[0]); r.setEndAfter(made[made.length - 1]); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function changeCase(mode) {
    restoreSel(); const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed) { toast('আগে লেখা সিলেক্ট করুন', 'info'); return; }
    const r = sel.getRangeAt(0), frag = r.extractContents();
    const w = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT); let n; const nodes = []; while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(t => { const v = t.nodeValue; t.nodeValue = mode === 'upper' ? v.toUpperCase() : mode === 'lower' ? v.toLowerCase() : v.toLowerCase().replace(/(^|[\s(\-"'])([a-z])/g, (m, a, b) => a + b.toUpperCase()); });
    const first = frag.firstChild, last = frag.lastChild; r.insertNode(frag);
    if (first && last) { const nr = document.createRange(); nr.setStartBefore(first); nr.setEndAfter(last); sel.removeAllRanges(); sel.addRange(nr); }
    saveSel(); syncEmpty();
  }
  function clearFormat() {
    restoreSel(); exec('removeFormat'); exec('unlink');
    eachBlock(b => { b.removeAttribute('style'); b.classList.remove('doc-sub'); });
  }
  function takePainter() {
    restoreSel(); const q = (c) => { try { return document.queryCommandState(c); } catch (e) { return false; } }, v = (c) => { try { return document.queryCommandValue(c); } catch (e) { return ''; } };
    const el = curEl(), cs = el ? getComputedStyle(el) : null;
    painter = { b: q('bold'), i: q('italic'), u: q('underline'), s: q('strikeThrough'), fore: v('foreColor'), back: v('hiliteColor'), font: cs ? cs.fontFamily.split(',')[0].replace(/["']/g, '') : '', px: cs ? parseFloat(cs.fontSize) : 0 };
    $q('[data-a=painter]').classList.add('on'); toast('এবার যে লেখায় এই ফরম্যাট চান সেটা সিলেক্ট করুন', 'info');
  }
  function usePainter() {
    const p = painter; painter = null; $q('[data-a=painter]').classList.remove('on');
    const sel = getSelection(); if (!p || !sel.rangeCount || sel.isCollapsed || !inArea(sel.anchorNode)) return;
    const q = (c) => document.queryCommandState(c);
    exec('removeFormat');
    if (p.b && !q('bold')) exec('bold'); if (p.i && !q('italic')) exec('italic'); if (p.u && !q('underline')) exec('underline'); if (p.s && !q('strikeThrough')) exec('strikeThrough');
    if (p.fore) exec('foreColor', p.fore); if (p.back && p.back !== 'rgba(0, 0, 0, 0)' && p.back !== 'transparent') exec('hiliteColor', p.back);
    if (p.font) exec('fontName', p.font); if (p.px) setSize(Math.round(p.px));
  }
  function setBlock(v) {
    if (v === 'p' || v === 'subtitle') exec('formatBlock', '<p>');
    else exec('formatBlock', v === 'title' ? '<h1>' : v === 'quote' ? '<blockquote>' : '<h' + (+v[1] + 1) + '>');
    eachBlock(b => b.classList.toggle('doc-sub', v === 'subtitle'));
  }
  function listCmd(kind, type) {
    exec(kind === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
    const l = closest(kind); if (l) { if (type) l.style.listStyleType = type; else l.style.removeProperty('list-style-type'); if (!l.getAttribute('style')) l.removeAttribute('style'); }
  }
  function setDir(d) { eachBlock(b => b.setAttribute('dir', d)); }

  /* ---------- link / image / table ---------- */
  function addLink() {
    restoreSel(); const sel = getSelection();
    const a = closest('a'), old = a ? a.getAttribute('href') : '';
    if (!selImg && (!sel.rangeCount || (sel.isCollapsed && !a))) { toast('যে লেখা বা ছবিতে লিংক দিতে চান আগে সেটি সিলেক্ট করুন', 'info'); return; }
    let url = prompt('লিংক দিন (খালি রাখলে লিংক সরে যাবে)', old || 'https://');
    if (url === null) return; url = url.trim();
    if (!url || url === 'https://') { if (a) exec('unlink'); return; }
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) url = 'https://' + url;
    if (selImg && !closest('a')) { const l = document.createElement('a'); l.href = url; selImg.replaceWith(l); l.appendChild(selImg); syncEmpty(); return; }
    exec('createLink', url);
  }
  function pickImg(img) { if (selImg) selImg.classList.remove('ed-sel'); selImg = img; if (img) img.classList.add('ed-sel'); }
  function insertImageFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('ছবির ফাইল বেছে নিন', 'error'); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const MAX = 900, k = Math.min(1, MAX / im.width), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const g = c.getContext('2d'); const png = file.type === 'image/png'; if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); } g.drawImage(im, 0, 0, c.width, c.height);
        const url = png && c.width * c.height < 250000 ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.78);
        html(`<img src="${url}" alt="${esc(file.name.replace(/\.[^.]+$/, ''))}" style="max-width:100%">`);
        toast('ছবি যোগ হয়েছে (বড় ছবি নিজে থেকেই ছোট করা হয়েছে)', 'success');
      };
      im.onerror = () => toast('ছবিটি পড়া যায়নি', 'error'); im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function imgStyle(fn) { if (!selImg) { toast('আগে ছবিতে ক্লিক করে সিলেক্ট করুন', 'info'); return; } fn(selImg.style); syncEmpty(); }
  const IMG_POS = {
    'i-left': ['block', 'none', '0 auto 0 0'], 'i-center': ['block', 'none', '0 auto'], 'i-right': ['block', 'none', '0 0 0 auto'],
    'i-wl': ['block', 'left', '0 14px 8px 0'], 'i-wr': ['block', 'right', '0 0 8px 14px'], 'i-wn': ['block', 'none', '0 auto']
  };
  function tableHtml(r, c, head) {
    const row = (t) => '<tr>' + Array.from({ length: c }, () => `<${t}><br></${t}>`).join('') + '</tr>';
    return '<table><tbody>' + (head ? row('th') : row('td')) + Array.from({ length: Math.max(0, r - 1) }, () => row('td')).join('') + '</tbody></table><p><br></p>';
  }
  function tableOp(a) {
    const td = closest('td,th'); if (!td) { toast('আগে টেবিলের কোনো ঘরে ক্লিক করুন', 'info'); return; }
    const tr = td.parentElement, table = td.closest('table'), cols = [...tr.children].reduce((s, x) => s + (x.colSpan || 1), 0);
    const mk = (tag = 'td') => { const e = document.createElement(tag); e.innerHTML = '<br>'; return e; };
    if (a === 't-rowa' || a === 't-rowb') { const n = document.createElement('tr'); for (let i = 0; i < cols; i++) n.appendChild(mk()); a === 't-rowa' ? tr.after(n) : tr.before(n); }
    else if (a === 't-cola' || a === 't-colb') { const i = td.cellIndex; table.querySelectorAll('tr').forEach(r => { const c = r.children[i]; const n = mk(c ? c.tagName.toLowerCase() : 'td'); if (!c) r.appendChild(n); else a === 't-cola' ? c.after(n) : c.before(n); }); }
    else if (a === 't-rowd') { if (table.rows.length <= 1) table.remove(); else tr.remove(); }
    else if (a === 't-cold') { const i = td.cellIndex; table.querySelectorAll('tr').forEach(r => { if (r.children.length <= 1) r.remove(); else if (r.children[i]) r.children[i].remove(); }); if (!table.querySelector('td,th')) table.remove(); }
    else if (a === 't-del') table.remove();
    else if (a === 't-merge') { const nx = td.nextElementSibling; if (!nx) { toast('ডানে মার্জ করার মতো ঘর নেই', 'info'); return; } td.colSpan = (td.colSpan || 1) + (nx.colSpan || 1); if (nx.textContent.trim()) td.innerHTML += ' ' + nx.innerHTML; nx.remove(); }
    else if (a === 't-split') { const k = td.colSpan || 1; if (k < 2) { toast('এই ঘর মার্জ করা নয়', 'info'); return; } td.removeAttribute('colspan'); for (let i = 1; i < k; i++) td.after(mk(td.tagName.toLowerCase())); }
    else if (a === 't-head') { const first = table.rows[0], toTh = first.children[0].tagName === 'TD'; [...first.children].forEach(c => { const n = document.createElement(toTh ? 'th' : 'td'); n.innerHTML = c.innerHTML; if (c.colSpan > 1) n.colSpan = c.colSpan; c.replaceWith(n); }); }
    else if (a === 't-border') { if (table.dataset.b === '0') table.removeAttribute('data-b'); else table.dataset.b = '0'; }
    syncEmpty();
  }

  /* ---------- structure ---------- */
  function headings() { return [...area.querySelectorAll('h1,h2,h3,h4')].filter(h => !h.closest('.toc') && h.textContent.trim()); }
  function buildToc() {
    const hs = headings(); if (!hs.length) { toast('সূচিপত্রের জন্য আগে হেডিং (হেডিং ১/২/৩) ব্যবহার করুন', 'info'); return; }
    hs.forEach((h, i) => { h.id = 'h-' + (i + 1); });
    const body = '<p><b>সূচিপত্র</b></p>' + hs.map(h => `<p style="margin-left:${(h.tagName === 'H1' ? 0 : +h.tagName[1] - 2) * 18}px"><a href="#h-${hs.indexOf(h) + 1}">${esc(h.textContent.trim())}</a></p>`).join('');
    const old = area.querySelector('.toc');
    if (old) { old.innerHTML = body; syncEmpty(); toast('সূচিপত্র আপডেট হয়েছে', 'success'); } else { html(`<div class="toc">${body}</div><p><br></p>`); toast('সূচিপত্র যোগ হয়েছে (বদলালে আবার চাপুন)', 'success'); }
  }
  function footnote() {
    const t = prompt('পাদটীকার লেখা'); if (!t || !t.trim()) return;
    const n = area.querySelectorAll('sup.fn-ref').length + 1;
    html(`<sup class="fn-ref">[${n}]</sup>&nbsp;`);
    let l = area.querySelector('.fn-list'); if (!l) { l = document.createElement('div'); l.className = 'fn-list'; area.appendChild(l); }
    l.insertAdjacentHTML('beforeend', `<p>[${n}] ${esc(t.trim())}</p>`); syncEmpty();
  }

  /* ---------- panels ---------- */
  let panelName = '';
  function openPanel(name) {
    if (panelName === name && !panel.hidden) { closePanel(); return; }
    panelName = name; panel.hidden = false; panel.dataset.p = name;
    const P = {
      table: `<div class="pn-row"><label>সারি <input type="number" id="${uid}r" value="3" min="1" max="50"></label><label>কলাম <input type="number" id="${uid}c" value="3" min="1" max="12"></label><label class="chk"><input type="checkbox" id="${uid}h" checked> প্রথম সারি হেডার</label><button type="button" class="pn-go" data-a="do-table">টেবিল বানান</button></div>`,
      special: Object.entries(SPECIAL).map(([g, a]) => `<div class="pn-grp"><b>${g}</b><div class="pn-chars">${a.map(c => `<button type="button" data-ch="${esc(c)}" aria-label="${esc(c)}">${/[ً-ٰٟۖ-ۭ]/.test(c) ? '◌' + c : esc(c)}</button>`).join('')}</div></div>`).join(''),
      formula: `<div class="pn-grp"><b>তৈরি সূত্র (ক্লিক করলেই বসবে)</b><div class="pn-list">${FORMULAS.map(f => `<button type="button" data-ch="${esc(f)}">${esc(f)}</button>`).join('')}</div></div><div class="pn-row"><label>নিজের সূত্র <input type="text" id="${uid}f" placeholder="যেমন x² + y² = r²" style="min-width:220px"></label><button type="button" class="pn-go" data-a="do-formula">বসান</button></div><span class="ed-note">প্রতীকের জন্য "বিশেষ চিহ্ন" ব্যবহার করুন (গণিত, সাব/সুপার ট্যাব)। এটা সাধারণ টেক্সট সূত্র — জটিল সমীকরণ চিত্র নয়।</span>`,
      find: `<div class="pn-row"><label>খুঁজুন <input type="text" id="${uid}q" placeholder="শব্দ বা বাক্য"></label><label>বদলে <input type="text" id="${uid}w" placeholder="নতুন শব্দ"></label><label class="chk"><input type="checkbox" id="${uid}cs"> বড়/ছোট হাতের মিল</label></div><div class="pn-row"><button type="button" data-a="f-prev">◀ আগে</button><button type="button" data-a="f-next">পরে ▶</button><button type="button" data-a="f-rep">বদলান</button><button type="button" data-a="f-all">সব বদলান</button><span class="pn-info" id="${uid}i"></span></div>`,
      count: '', nav: '', ver: '', style: ''
    };
    panel.innerHTML = `<button type="button" class="pn-x" data-a="pn-close" aria-label="বন্ধ করুন">✕</button>` + (P[name] || '');
    if (name === 'count') showCount(); else if (name === 'nav') showNav(); else if (name === 'ver') showVer(); else if (name === 'style') showStyle();
    if (name === 'find') { const q = panel.querySelector(`#${uid}q`); const s = getSelection().toString(); if (s && s.length < 80) q.value = s; q.focus(); findAll(); }
  }
  function closePanel() { panel.hidden = true; panelName = ''; matches = []; if (window.CSS && CSS.highlights) CSS.highlights.delete('ed-find'); }
  function showCount() {
    const t = (area.innerText || '').trim(), sel = getSelection().toString().trim();
    const stat = (s) => { const w = s ? s.split(/\s+/).length : 0; return `<td>${w}</td><td>${s.replace(/\s/g, '').length}</td><td>${s.length}</td>`; };
    const paras = [...area.querySelectorAll(BLOCKS)].filter(e => !e.querySelector(BLOCKS) && e.textContent.trim()).length;
    panel.insertAdjacentHTML('beforeend', `<table class="pn-tbl"><tr><th></th><th>শব্দ</th><th>অক্ষর (স্পেস ছাড়া)</th><th>অক্ষর (স্পেসসহ)</th></tr><tr><th>পুরো লেখা</th>${stat(t)}</tr><tr><th>নির্বাচিত অংশ</th>${stat(sel)}</tr></table><p class="ed-note">প্যারাগ্রাফ: ${paras}</p>`);
  }
  function showNav() {
    const hs = headings();
    panel.insertAdjacentHTML('beforeend', hs.length ? `<div class="pn-nav">${hs.map((h, i) => `<button type="button" data-nav="${i}" style="padding-left:${(h.tagName === 'H1' ? 0 : +h.tagName[1] - 1) * 16 + 10}px">${esc(h.textContent.trim().slice(0, 70))}</button>`).join('')}</div>` : '<p class="ed-note">এখনো কোনো হেডিং নেই। "স্টাইল" মেনু থেকে হেডিং ১/২/৩ দিন।</p>');
  }
  const verKey = () => 'ed_ver_' + curKey, draftKey = () => 'ed_draft_' + curKey;
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const when = (t) => new Date(t).toLocaleString('bn-BD', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  function showVer() {
    const v = lsGet(verKey()) || [];
    panel.insertAdjacentHTML('beforeend', v.length ? `<div class="pn-list">${v.map((x, i) => `<button type="button" data-ver="${i}">${when(x.t)} — ${x.html.replace(/<[^>]+>/g, ' ').trim().slice(0, 50) || 'ফাঁকা'}</button>`).join('')}</div><span class="ed-note">প্রতিবার সংরক্ষণের সময় সংস্করণ রাখা হয় (এই ব্রাউজারে সর্বশেষ ১০টি)।</span>` : '<p class="ed-note">এখনো কোনো সংস্করণ নেই — নোট সংরক্ষণ করলে এখানে জমা হবে।</p>');
  }
  function showStyle() {
    const st = lsGet('ed_styles') || [];
    panel.insertAdjacentHTML('beforeend', `<div class="pn-row"><label>স্টাইলের নাম <input type="text" id="${uid}sn" placeholder="যেমন: আয়াত"></label><button type="button" class="pn-go" data-a="st-save">বর্তমান প্যারাগ্রাফ থেকে সংরক্ষণ</button></div><div class="pn-list">${st.map((s, i) => `<button type="button" data-st="${i}">${esc(s.name)} <small data-stdel="${i}">✕</small></button>`).join('') || '<span class="ed-note">কোনো স্টাইল নেই। একটি প্যারাগ্রাফ সাজিয়ে (ফন্ট, সাইজ, রং, দূরত্ব) নাম দিয়ে সংরক্ষণ করুন, পরে এক ক্লিকে প্রয়োগ করুন।</span>'}</div>`);
  }
  function saveStyle() {
    const name = (panel.querySelector(`#${uid}sn`).value || '').trim(); if (!name) { toast('স্টাইলের নাম দিন', 'info'); return; }
    const b = closest('p,div,h1,h2,h3,h4,blockquote,li'); if (!b) { toast('আগে সাজানো প্যারাগ্রাফে কার্সর রাখুন', 'info'); return; }
    const span = b.querySelector('span[style]'), st = lsGet('ed_styles') || [];
    st.push({ name, tag: b.tagName.toLowerCase(), cls: b.classList.contains('doc-sub') ? 'doc-sub' : '', style: b.getAttribute('style') || '', inline: span ? span.getAttribute('style') || '' : '' });
    lsSet('ed_styles', st.slice(-20)); showStyleRefresh(); toast('স্টাইল সংরক্ষিত', 'success');
  }
  const showStyleRefresh = () => { const n = panelName; panelName = ''; openPanel(n); };
  function applyStyle(i) {
    const s = (lsGet('ed_styles') || [])[i]; if (!s) return;
    if (s.tag !== 'li') exec('formatBlock', '<' + (s.tag === 'div' ? 'p' : s.tag) + '>');
    eachBlock(b => { if (s.style) b.setAttribute('style', s.style); else b.removeAttribute('style'); b.classList.toggle('doc-sub', s.cls === 'doc-sub'); if (s.inline) { b.querySelectorAll('span[style]').forEach(x => x.removeAttribute('style')); if (!b.querySelector('span')) b.innerHTML = '<span style="' + s.inline + '">' + b.innerHTML + '</span>'; } });
  }

  /* ---------- find / replace ---------- */
  function findAll() {
    const q = (panel.querySelector(`#${uid}q`) || {}).value || '', cs = (panel.querySelector(`#${uid}cs`) || {}).checked; matches = []; mi = -1;
    if (window.CSS && CSS.highlights) CSS.highlights.delete('ed-find');
    if (q) {
      const needle = cs ? q : q.toLowerCase(), w = document.createTreeWalker(area, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const t = cs ? n.nodeValue : n.nodeValue.toLowerCase(); let i = 0; while ((i = t.indexOf(needle, i)) >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + q.length); matches.push(r); i += q.length; } }
      if (window.CSS && CSS.highlights && matches.length) CSS.highlights.set('ed-find', new Highlight(...matches));
    }
    const info = panel.querySelector(`#${uid}i`); if (info) info.textContent = q ? (matches.length ? matches.length + 'টি পাওয়া গেছে' : 'পাওয়া যায়নি') : '';
  }
  function goMatch(d) {
    if (!matches.length) findAll(); if (!matches.length) return;
    mi = (mi + d + matches.length) % matches.length; const r = matches[mi], s = getSelection(); s.removeAllRanges(); s.addRange(r);
    nodeEl(r.startContainer).scrollIntoView({ block: 'center' }); const info = panel.querySelector(`#${uid}i`); if (info) info.textContent = (mi + 1) + ' / ' + matches.length;
  }
  function replaceOne() {
    if (mi < 0 || !matches[mi]) { goMatch(1); return; }
    const rep = panel.querySelector(`#${uid}w`).value, r = matches[mi]; r.deleteContents(); r.insertNode(document.createTextNode(rep)); syncEmpty(); findAll();
  }
  function replaceAll() {
    findAll(); const rep = panel.querySelector(`#${uid}w`).value, n = matches.length; if (!n) return;
    for (let i = n - 1; i >= 0; i--) { matches[i].deleteContents(); matches[i].insertNode(document.createTextNode(rep)); }
    syncEmpty(); findAll(); toast(n + 'টি বদলানো হয়েছে', 'success');
  }

  /* ---------- print / export ---------- */
  const fullDoc = (forDoc) => {
    const body = cleanHtml(area.innerHTML), L = layout;
    return `<!doctype html><html lang="bn" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>নোট</title><link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Hind+Siliguri:wght@400;600&family=Noto+Serif+Bengali:wght@400;600&display=swap" rel="stylesheet"><style>${CSS_PRINT}${forDoc ? '' : `@page{size:${PAGE[L.size] || 'A4'} ${L.orient};margin:${L.margin}mm;${L.pageNo ? '@bottom-center{content:counter(page);font-size:10pt}' : ''}}.hd,.ft{position:fixed;left:0;right:0;text-align:center;font-size:10pt;color:#555}.hd{top:-${Math.max(6, L.margin - 4)}mm}.ft{bottom:-${Math.max(6, L.margin - 4)}mm}.pb{position:fixed;inset:-${Math.max(4, L.margin - 6)}mm;border:2px solid #333}.bar{position:sticky;top:0;background:#0F5A46;color:#fff;padding:8px;text-align:center}.bar button{font:inherit;padding:6px 16px;border-radius:8px;border:0;background:#E2AF5E;cursor:pointer}@media print{.bar{display:none}}`}</style></head><body>${forDoc ? '' : `<div class="bar"><button onclick="print()">প্রিন্ট / PDF হিসেবে সেভ</button></div>${L.border ? '<div class="pb"></div>' : ''}${L.header ? `<div class="hd">${esc(L.header)}</div>` : ''}${L.footer ? `<div class="ft">${esc(L.footer)}</div>` : ''}`}<div class="doc">${body}</div></body></html>`;
  };
  function printWin(auto) {
    if (!hasContent()) { toast('প্রিন্ট করার মতো লেখা নেই', 'info'); return; }
    const w = window.open('', '_blank'); if (!w) { toast('পপআপ ব্লক করা আছে — ব্রাউজারে এই সাইটের জন্য পপআপ অনুমতি দিন', 'error'); return; }
    w.document.open(); w.document.write(fullDoc(false)); w.document.close(); if (auto) setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* ignore */ } }, 700);
  }
  const download = (name, blob) => { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
  const loadScript = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load')); document.head.appendChild(s); });
  async function exportDoc(kind) {
    if (!hasContent()) { toast('এক্সপোর্ট করার মতো লেখা নেই', 'info'); return; }
    try {
      if (kind === 'txt') download('note.txt', new Blob(['﻿' + (area.innerText || '')], { type: 'text/plain;charset=utf-8' }));
      else if (kind === 'doc') download('note.doc', new Blob(['﻿' + fullDoc(true)], { type: 'application/msword' }));
      else if (kind === 'docx') {
        if (!window.htmlDocx) await loadScript('https://cdn.jsdelivr.net/npm/html-docx-js@0.3.1/dist/html-docx.js');
        download('note.docx', window.htmlDocx.asBlob(fullDoc(true)));
      }
      toast('ফাইল ডাউনলোড হয়েছে', 'success');
    } catch (e) { toast(kind === 'docx' ? 'DOCX বানাতে লাইব্রেরি লোড হয়নি (ইন্টারনেট লাগে)। বদলে DOC বা PDF ব্যবহার করুন।' : 'এক্সপোর্ট ব্যর্থ হয়েছে', 'error'); }
  }
  async function importDocx(file) {
    if (!file) return;
    try {
      if (!window.mammoth) await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js');
      const res = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { convertImage: window.mammoth.images.imgElement(i => i.read('base64').then(b => ({ src: 'data:' + i.contentType + ';base64,' + b }))) });
      const h = cleanHtml(res.value); if (!h.trim()) { toast('ফাইলে কোনো লেখা পাওয়া যায়নি', 'error'); return; }
      if (hasContent() && !confirm('বর্তমান লেখার জায়গায় ফাইলের লেখা বসবে। আগের লেখা মুছে যাবে — এগিয়ে যাবেন? (Ctrl+Z দিয়ে ফেরানো যাবে)')) return;
      area.focus(); document.execCommand('selectAll'); document.execCommand('insertHTML', false, h); syncEmpty(); toast('DOCX থেকে লেখা আনা হয়েছে', 'success');
    } catch (e) { toast('DOCX পড়া যায়নি (ফাইলটি ঠিক আছে কিনা এবং ইন্টারনেট আছে কিনা দেখুন)', 'error'); }
  }

  /* ---------- draft / versions ---------- */
  const cur = () => cleanHtml(area.innerHTML).trim();
  function autosave() {
    if (!dirty || ro) return; const h = hasContent() ? cur() : '';
    if (h && h !== baseHtml && lsSet(draftKey(), { t: Date.now(), html: h })) $q('.st-save').textContent = 'খসড়া সেভ হয়েছে ' + new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    dirty = false;
  }
  const timer = setInterval(() => { if (!document.body.contains(host)) { clearInterval(timer); return; } autosave(); }, 15000);
  addEventListener('beforeunload', autosave);
  function checkDraft() {
    const d = lsGet(draftKey()); banner.hidden = true;
    if (d && d.html && d.html !== baseHtml) {
      banner.hidden = false; banner.innerHTML = `<span>⚠ ${when(d.t)} সময়ের একটি অসংরক্ষিত খসড়া পাওয়া গেছে।</span><button type="button" data-a="draft-use">পুনরুদ্ধার করুন</button><button type="button" data-a="draft-drop">বাদ দিন</button>`;
    }
  }
  function snapshot() { const h = hasContent() ? cur() : ''; if (!h) return; const v = lsGet(verKey()) || []; if (!v.length || v[0].html !== h) v.unshift({ t: Date.now(), html: h }); lsSet(verKey(), v.slice(0, 10)); }
  function markSaved() { snapshot(); try { localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ } baseHtml = cur(); dirty = false; banner.hidden = true; $q('.st-save').textContent = 'সংরক্ষিত'; }

  /* ---------- events ---------- */
  host.addEventListener('mousedown', (e) => { if (e.target.closest('.ed-bar button, .ed-tabs button, .ed-panel button, .ed-ctx button')) e.preventDefault(); });
  host.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { host.querySelectorAll('[data-tab]').forEach(t => { t.classList.toggle('on', t === tab); t.setAttribute('aria-selected', t === tab); }); host.querySelectorAll('.ed-tp').forEach(p => p.classList.toggle('on', p.dataset.tp === tab.dataset.tab)); return; }
    const img = e.target.closest('img'); if (img && area.contains(img)) { pickImg(img); } else if (e.target.closest('.ed-area')) pickImg(null);
    const sw = e.target.closest('[data-sw]'); if (sw) { exec('foreColor', sw.dataset.sw); return; }
    const ch = e.target.closest('[data-ch]'); if (ch) { text(ch.dataset.ch); return; }
    const nv = e.target.closest('[data-nav]'); if (nv) { const h = headings()[+nv.dataset.nav]; if (h) { h.scrollIntoView({ block: 'start' }); const r = document.createRange(); r.selectNodeContents(h); const s = getSelection(); s.removeAllRanges(); s.addRange(r); saveSel(); } return; }
    const vr = e.target.closest('[data-ver]'); if (vr) { const v = (lsGet(verKey()) || [])[+vr.dataset.ver]; if (v && confirm('এই সংস্করণ ফিরিয়ে আনবেন? বর্তমান লেখা বদলে যাবে।')) { area.innerHTML = cleanHtml(v.html); syncEmpty(); toast('সংস্করণ ফিরে এসেছে (সংরক্ষণ করতে ভুলবেন না)', 'success'); } return; }
    const sd = e.target.closest('[data-stdel]'); if (sd) { const st = lsGet('ed_styles') || []; st.splice(+sd.dataset.stdel, 1); lsSet('ed_styles', st); showStyleRefresh(); e.stopPropagation(); return; }
    const sy = e.target.closest('[data-st]'); if (sy) { applyStyle(+sy.dataset.st); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    act(b.dataset.a);
  });
  function act(a) {
    if (a.startsWith('p-')) return openPanel(a.slice(2));
    if (a.startsWith('t-')) return tableOp(a);
    if (IMG_POS[a]) { const [d, f, m] = IMG_POS[a]; return imgStyle(s => { s.display = d; s.float = f; s.margin = m; }); }
    switch (a) {
      case 'undo': case 'redo': return exec(a);
      case 'bold': case 'italic': case 'underline': case 'strikeThrough': case 'superscript': case 'subscript': case 'justifyLeft': case 'justifyCenter': case 'justifyRight': case 'justifyFull': case 'indent': case 'outdent': return exec(a);
      case 'painter': return painter ? (painter = null, $q('[data-a=painter]').classList.remove('on')) : takePainter();
      case 'clear': return clearFormat();
      case 'ul': return listCmd('ul', $q('[data-s=ultype]').value);
      case 'ol': return listCmd('ol', $q('[data-s=oltype]').value);
      case 'ltr': return setDir('ltr'); case 'rtl': return setDir('rtl');
      case 'pborder': return eachBlock(b => { if (b.style.border) { b.style.border = ''; b.style.padding = ''; } else { b.style.border = '1px solid #8a7a3a'; b.style.paddingLeft = '10px'; b.style.paddingRight = '10px'; b.style.paddingTop = '6px'; b.style.paddingBottom = '6px'; } if (!b.getAttribute('style')) b.removeAttribute('style'); });
      case 'pbgclear': return eachBlock(b => { b.style.backgroundColor = ''; if (!b.getAttribute('style')) b.removeAttribute('style'); });
      case 'marks': return area.classList.toggle('marks');
      case 'link': return addLink(); case 'unlink': return exec('unlink');
      case 'img': return $q('[data-file=img]').click();
      case 'i-del': return imgStyle(() => { selImg.remove(); selImg = null; });
      case 'hr': return html('<hr><p><br></p>');
      case 'pgbreak': return html('<hr class="pgbreak"><p><br></p>');
      case 'quote': return setBlock('quote');
      case 'date': return text(new Date().toLocaleString('bn-BD', { dateStyle: 'long', timeStyle: 'short' }));
      case 'footnote': return footnote(); case 'toc': return buildToc();
      case 'do-table': { const r = Math.min(50, Math.max(1, +panel.querySelector(`#${uid}r`).value || 3)), c = Math.min(12, Math.max(1, +panel.querySelector(`#${uid}c`).value || 3)); html(tableHtml(r, c, panel.querySelector(`#${uid}h`).checked)); return closePanel(); }
      case 'do-formula': { const v = panel.querySelector(`#${uid}f`).value.trim(); if (v) text(v); return; }
      case 'f-prev': return goMatch(-1); case 'f-next': return goMatch(1); case 'f-rep': return replaceOne(); case 'f-all': return replaceAll();
      case 'pn-close': return closePanel();
      case 'spell': { area.spellcheck = !area.spellcheck; $q('[data-a=spell]').classList.toggle('on', area.spellcheck); toast(area.spellcheck ? 'বানান পরীক্ষা চালু (ব্রাউজারের অভিধান; বাংলা/আরবি সমর্থন ব্রাউজারভেদে আলাদা)' : 'বানান পরীক্ষা বন্ধ', 'info'); return; }
      case 'ro': { ro = !ro; area.contentEditable = ro ? 'false' : 'true'; host.classList.toggle('ro', ro); $q('[data-a=ro]').classList.toggle('on', ro); return; }
      case 'full': return host.classList.toggle('full');
      case 'preview': return printWin(false); case 'print': case 'pdf': return printWin(true);
      case 'new': if (!hasContent() || confirm('বর্তমান লেখা মুছে নতুন ফাঁকা ডকুমেন্ট শুরু করবেন?')) { area.innerHTML = ''; syncEmpty(); } return;
      case 'save': return onSave ? onSave() : toast('এই এডিটরে আলাদা সেভ বাটন নেই — নিচের "সংরক্ষণ" বাটন চাপুন', 'info');
      case 'docx': case 'doc': case 'txt': return exportDoc(a);
      case 'import': return $q('[data-file=docx]').click();
      case 'st-save': return saveStyle();
      case 'draft-use': { const d = lsGet(draftKey()); if (d) { area.innerHTML = cleanHtml(d.html); syncEmpty(); } banner.hidden = true; return; }
      case 'draft-drop': try { localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ } banner.hidden = true; return;
      default:
    }
  }
  host.addEventListener('change', (e) => {
    const t = e.target, l = t.dataset.l;
    if (l) { layout[l] = t.type === 'checkbox' ? t.checked : t.value; saveLayout(); return; }
    if (t.matches(`#${uid}cs, #${uid}q`)) return findAll();
    if (t.dataset.file === 'img') { insertImageFile(t.files[0]); t.value = ''; return; }
    if (t.dataset.file === 'docx') { importDocx(t.files[0]); t.value = ''; return; }
    const s = t.dataset.s, c = t.dataset.color;
    if (c) { if (c === 'pbg') eachBlock(b => { b.style.backgroundColor = t.value; }); else exec(c, t.value); t.parentElement.style.setProperty('--c', t.value); return; }
    if (!s) return; const v = t.value;
    if (s === 'block') setBlock(v);
    else if (s === 'font') { if (v) exec('fontName', v); }
    else if (s === 'size') { const n = +v; if (n >= 6 && n <= 200) setSize(n); }
    else if (s === 'case') { if (v) changeCase(v); t.value = ''; }
    else if (s === 'lh') { if (v) eachBlock(b => { b.style.lineHeight = v; }); t.value = ''; }
    else if (s === 'before') { if (v !== '') eachBlock(b => { b.style.marginTop = v + 'px'; }); t.value = ''; }
    else if (s === 'after') { if (v !== '') eachBlock(b => { b.style.marginBottom = v + 'px'; }); t.value = ''; }
    else if (s === 'ultype' || s === 'oltype') { const k = s === 'ultype' ? 'ul' : 'ol', l2 = closest(k); if (l2) { if (v) l2.style.listStyleType = v; else l2.style.removeProperty('list-style-type'); syncEmpty(); } }
    else if (s === 'tcellalign') { const td = closest('td,th'); if (td && v) { td.style.textAlign = v; syncEmpty(); } t.value = ''; }
    else if (s === 'tpad') { const td = closest('td,th'); if (td && v) { const tb = td.closest('table'); tb.querySelectorAll('td,th').forEach(c2 => { c2.style.paddingTop = c2.style.paddingBottom = v + 'px'; c2.style.paddingLeft = c2.style.paddingRight = (+v + 4) + 'px'; }); syncEmpty(); } t.value = ''; }
    else if (s === 'imgw') { if (v) imgStyle(st => { st.width = v; st.height = ''; }); t.value = ''; }
    else if (s === 'imgpx') { const n = +v; if (n >= 20) imgStyle(st => { st.width = n + 'px'; st.height = ''; }); }
    else if (s === 'lang') { area.lang = v; area.dir = v === 'ar' ? 'rtl' : 'ltr'; if (v !== 'ar') area.removeAttribute('dir'); }
    else if (s === 'tpl') { if (v && (!hasContent() || confirm('বর্তমান লেখার জায়গায় টেমপ্লেট বসবে — এগিয়ে যাবেন?'))) { area.innerHTML = cleanHtml(TEMPLATES[v]); syncEmpty(); } t.value = ''; }
  });
  host.addEventListener('input', (e) => { if (e.target.matches(`#${uid}q`)) findAll(); });
  host.addEventListener('keydown', (e) => { if (e.target.matches(`#${uid}q`) && e.key === 'Enter') { e.preventDefault(); goMatch(e.shiftKey ? -1 : 1); } if (e.key === 'Escape' && !panel.hidden) closePanel(); });
  area.addEventListener('input', () => { if (pendingPx && area.querySelector('font[size="7"]')) { fixFonts(pendingPx); pendingPx = 0; } syncEmpty(); saveSel(); });
  area.addEventListener('keyup', () => { saveSel(); refresh(); });
  area.addEventListener('mouseup', () => { saveSel(); refresh(); if (painter) usePainter(); });
  area.addEventListener('focus', () => { document.execCommand('styleWithCSS', false, true); document.execCommand('defaultParagraphSeparator', false, 'p'); });
  document.addEventListener('selectionchange', () => { if (inArea(getSelection().anchorNode)) { saveSel(); refresh(); } });
  area.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase(), m = e.ctrlKey || e.metaKey;
    if (!m) return;
    if (k === 's') { e.preventDefault(); act('save'); }
    else if (k === 'f') { e.preventDefault(); openPanel('find'); }
    else if (k === 'k') { e.preventDefault(); addLink(); }
    else if (k === 'v' && e.shiftKey) plainNext = true;
  });
  area.addEventListener('paste', (e) => {
    e.preventDefault(); const cd = e.clipboardData; if (!cd) return;
    const files = [...(cd.files || [])].filter(f => /^image\//.test(f.type)); if (files.length) { insertImageFile(files[0]); return; }
    const h = cd.getData('text/html'), t = cd.getData('text/plain');
    const ins = !plainNext && h ? cleanHtml(h) : esc(t).replace(/\r?\n/g, '<br>'); plainNext = false;
    document.execCommand('insertHTML', false, ins); syncEmpty();
  });
  area.addEventListener('drop', (e) => { const f = [...(e.dataTransfer.files || [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); insertImageFile(f); } });
  // right-click menu
  let ctx = null;
  const closeCtx = () => { if (ctx) { ctx.remove(); ctx = null; } };
  area.addEventListener('contextmenu', (e) => {
    if (ro) return; e.preventDefault(); closeCtx(); saveSel();
    ctx = document.createElement('div'); ctx.className = 'ed-ctx'; ctx.style.left = Math.min(e.clientX, innerWidth - 190) + 'px'; ctx.style.top = Math.min(e.clientY, innerHeight - 330) + 'px';
    const items = [['cut', 'কাট'], ['copy', 'কপি'], ['paste', 'পেস্ট'], ['pastetext', 'ফরম্যাট ছাড়া পেস্ট'], ['|'], ['bold', 'বোল্ড'], ['italic', 'ইটালিক'], ['underline', 'আন্ডারলাইন'], ['link', 'লিংক'], ['clear', 'ফরম্যাট মুছুন'], ['|'], ['selectAll', 'সব সিলেক্ট']];
    ctx.innerHTML = items.map(([a, l]) => a === '|' ? '<hr>' : `<button type="button" data-c="${a}">${l}</button>`).join(''); document.body.appendChild(ctx);
    ctx.addEventListener('mousedown', (ev) => ev.preventDefault());
    ctx.addEventListener('click', async (ev) => {
      const c = ev.target.closest('[data-c]'); if (!c) return; const a = c.dataset.c; closeCtx(); restoreSel();
      if (a === 'paste' || a === 'pastetext') { try { const t = await navigator.clipboard.readText(); exec('insertText', t); } catch (er) { toast('ব্রাউজার ক্লিপবোর্ড পড়তে দিচ্ছে না — Ctrl+V ব্যবহার করুন', 'info'); } }
      else if (a === 'link') addLink(); else if (a === 'clear') clearFormat(); else document.execCommand(a);
      syncEmpty();
    });
  });
  document.addEventListener('click', (e) => { if (ctx && !ctx.contains(e.target)) closeCtx(); });
  document.addEventListener('scroll', closeCtx, true);

  counts();
  return {
    getHtml() { const h = cur(); return hasContent() ? h : ''; },
    getText() { return (area.innerText || area.textContent || '').trim(); },
    setHtml(h, k) { if (k != null) curKey = k; area.innerHTML = cleanHtml(h) || ''; saved = null; baseHtml = cur(); dirty = false; syncEmpty(); dirty = false; closePanel(); checkDraft(); },
    clear(k) { if (k != null) curKey = k; area.innerHTML = ''; saved = null; baseHtml = ''; syncEmpty(); dirty = false; closePanel(); checkDraft(); },
    setKey(k) { curKey = k; }, markSaved, focus() { area.focus(); }
  };
}
