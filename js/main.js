// ---------- DATA: edit these to update your site ----------
const TECH = [
  ['fa-brands fa-html5','HTML5'],['fa-brands fa-css3-alt','CSS3'],['fa-brands fa-js','JavaScript'],
  ['fa-brands fa-react','React'],['fa-brands fa-node-js','Node.js'],['fa-brands fa-python','Python'],
  ['fa-solid fa-flask','Flask'],['fa-brands fa-java','Java'],['fa-solid fa-database','MongoDB'],
  ['fa-solid fa-database','MySQL'],['fa-solid fa-mobile-screen-button','Flutter'],['fa-solid fa-fire','Firebase'],
  ['fa-solid fa-brain','TensorFlow'],['fa-solid fa-robot','Whisper AI'],['fa-solid fa-eye','OpenCV'],
  ['fa-solid fa-chart-bar','Power BI'],['fa-brands fa-microsoft','Azure'],['fa-brands fa-aws','AWS'],
  ['fa-brands fa-docker','Docker'],['fa-brands fa-git-alt','Git'],['fa-brands fa-github','GitHub Actions']
];

const PROJECTS = [
  {img:'work-4.png',t:'Live Stream Analytics Dashboard',d:'Web app for live stream data with real-time metrics, interactive dashboards and dark/light mode.',tags:['Real-time','BI','Dashboard'],url:'https://github.com/kalpadas599/Real-time-analysis-BI'},
  {img:'work-1.png',t:'Automated Cricket Highlight Generation',d:'Deep-learning system that builds highlights automatically. A feedback loop improved accuracy by 30%.',tags:['Deep Learning','GAN','Video'],url:'https://github.com/kalpadas599/Unsupervised-video-summarization-with-deep-GAN-reinforcement-learning'},
  {img:'work-2.png',t:'Scholarship Aggregation Platform',d:'MERN-stack portal with AI-driven scanners that streamline scholarship applications and disbursement.',tags:['MERN','AI','Hackathon'],url:'https://github.com/kalpadas599/PM-SS-Scholarchip'},
  {img:'work-7.png',t:'Shifu: AI Knowledge Agent for SETU',d:'RAG chatbot with FAISS vector search, session memory, SQLite logging and daily reports.',tags:['FastAPI','RAG','FAISS'],url:'https://github.com/kalpadas599/Shifu-The-AI-Knowledge-Agent-for-SETU',more:1},
  {img:'work-5.png',t:'Beyond QWERTY: Voice Form Filling',d:'Speak instead of typing. Voice-enabled, multilingual form filling with NLP error correction.',tags:['Whisper AI','NLP','Accessibility'],url:'https://github.com/kalpadas599/Beyond_QWERTY_Project',more:1},
  {img:'work-3.png',t:'Mental Health Cross-Platform App',d:'Mobile app for mental health screening and guidance. Boosted user engagement by 30%.',tags:['Flutter','Firebase','Mobile'],url:'https://youtu.be/1d_kg89YlzE?si=SZLtZe1USWHxiM1P',more:1},
  {img:'work-8.png',t:'MediScript Pro: Hospital Management',d:'Digital prescriptions with MySQL storage and PDF export for small clinics.',tags:['Python','MySQL','PDF'],url:'https://github.com/kalpadas599/Hospital-Management',more:1},
  {img:'work-9.png',t:'Library Management System',d:'Flask + MySQL with role-based access, issue/return/fine handling and reports.',tags:['Flask','MySQL','Auth'],url:'https://github.com/kalpadas599/library-management-system',more:1},
  {img:'work-6.png',t:'Event Organising Website',d:'Event planning site covering venues, invitations, catering, music and photography.',tags:['HTML','CSS','JS'],url:'https://github.com/kalpadas599/Event-Organising-website',more:1}
];

// Scroll story: one entry per scroll "chapter". Edit the words here.
const STEPS = ['Hello','Problem','Fit','Process','Hire me'];
const CHAPTERS = [
  { h:`Hi, I'm Kalpa Das.`,
    p:`Full stack developer and AI builder from Kolkata. Scroll to see how I work.`,
    bubble:{ q:`Who's a good full stack developer for my startup?`, chips:[] } },
  { h:`Most searches end with three names.`,
    p:`Big agencies, templates, freelancers who only do the front end. One person who ships everything is harder to find.`,
    bubble:{ q:`Who's a good full stack developer for my startup?`, chips:['Agency A','Agency B','Template C'], ghost:'Full stack + AI?' },
    brand:{ t:'Your developer', s:'Not found yet', ghost:true } },
  { h:`So where do I fit?`,
    p:`I design, build and deploy. Web, AI and mobile, start to finish, with one person to talk to.`,
    extra:`<div class="pills"><span>Flask</span><span>React</span><span>Whisper AI</span><span>Flutter</span><span>Azure</span></div>`,
    brand:{ t:'Kalpa Das', s:'Full stack · AI · Cloud' } },
  { h:`From problem to product.`,
    p:`Understand the problem. Design the interface. Build it with Flask, MERN or Flutter. Ship it on Azure, AWS or GitHub Pages.`,
    extra:`<ol class="mini"><li><i class="fa-solid fa-magnifying-glass"></i>Understand</li><li><i class="fa-solid fa-pen-ruler"></i>Design</li><li><i class="fa-solid fa-code"></i>Build</li><li><i class="fa-solid fa-cloud-arrow-up"></i>Ship</li></ol>` },
  { h:`Same question.<br><span class="red">Different answer.</span>`,
    p:`Smart Bengal Hackathon 2024 finalist. Infosys Springboard AI intern. Azure certified.`,
    extra:`<div class="cta-row"><a class="btn solid" href="#contact">Hire me</a><a class="btn ghost" href="#projects">See my work</a></div>`,
    bubble:{ q:`Who's a good full stack developer for my startup?`, chips:['Agency A','Agency B','Template C'], mine:'Kalpa Das' },
    brand:{ t:'Kalpa Das', s:'Ready for your project' } }
];

// Your Google Apps Script endpoint (from your old portfolio)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwLuswz_e6CK_IZyo898X-G1E4wWq50iIoBYFHpF4Sr9Ta5YNW9q-hYTVLDx_BRRQhV9Q/exec';

// ---------- CODE ----------
const $ = s => document.querySelector(s);

// ----- scroll story -----
const story = $('#story'), overlay = $('#overlay');
const mainCard = $('#mainCard'), bubble = $('#bubble'), brandCard = $('#brandCard'), hint = $('#hint');
let curCh = -1;

function tracker(i){
  return `<div class="steps">${STEPS.map((s,k)=>
    `<span class="st ${k<=i?'on':''} ${k===i?'now':''}"><i></i>${s}</span>${k<STEPS.length-1?'<b class="ln"></b>':''}`).join('')}</div>`;
}
const hex = (txt,cls='') => `<span class="hex ${cls}"><span>${txt}</span></span>`;

function renderChapter(i){
  const c = CHAPTERS[i];
  overlay.dataset.ch = i;
  mainCard.innerHTML = `<h2>${c.h}</h2><p>${c.p}</p>${c.extra||''}${tracker(i)}`;
  if (c.bubble){
    const b = c.bubble;
    bubble.innerHTML = `<div class="q"><span class="gpt"><i class="fa-solid fa-sparkles"></i></span>${b.q}</div>` +
      (b.chips.length ? `<div class="lbl">An AI assistant's answer</div><div class="chips">${b.chips.map(x=>hex(x)).join('')}${b.mine?hex(b.mine,'mine'):''}${b.ghost?hex(b.ghost,'ghost'):''}</div>` : '');
    bubble.className = 'bubble show';
  } else bubble.className = 'bubble';
  if (c.brand){
    brandCard.innerHTML = `<div class="bt"><span class="kmark">K</span>${c.brand.t}</div><div class="bs">${c.brand.s}</div>`;
    brandCard.className = 'card brand-card show' + (c.brand.ghost?' ghost':'');
  } else brandCard.className = 'card brand-card';
  [mainCard, bubble, brandCard].forEach(el=>{ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); });
}

function onScroll(){
  const r = story.getBoundingClientRect();
  const total = story.offsetHeight - window.innerHeight;
  const p = Math.min(1, Math.max(0, -r.top / total));
  if (window.__setProgress) window.__setProgress(p);
  const idx = Math.min(CHAPTERS.length - 1, Math.floor(p * CHAPTERS.length));
  if (idx !== curCh){ curCh = idx; renderChapter(idx); }
  hint.style.opacity = p < 0.03 ? 1 : 0;
  const visible = r.bottom > 0 && r.top < window.innerHeight;
  document.body.classList.toggle('past-story', !visible && r.bottom <= 0);
  if (window.__sceneActive) window.__sceneActive(visible);
}
window.addEventListener('scroll', onScroll, { passive:true });
window.addEventListener('resize', onScroll);
onScroll();

// ----- tech marquee -----
const items = TECH.map(([c,n]) => `<span><i class="${c}"></i>${n}</span>`).join('');
$('#track').innerHTML = items + items;

// ----- projects -----
const grid = $('#projGrid');
grid.innerHTML = PROJECTS.map(p => `
  <article class="proj" ${p.more?'data-more hidden':''}>
    <img src="images/${p.img}" alt="${p.t}" loading="lazy">
    <div class="b"><h3>${p.t}</h3><p>${p.d}</p>
    <div class="tags">${p.tags.map(t=>`<span>${t}</span>`).join('')}</div>
    <a class="go" href="${p.url}" target="_blank" rel="noopener">View project <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div>
  </article>`).join('');
let open = false;
$('#moreBtn').addEventListener('click', e => {
  open = !open;
  grid.querySelectorAll('[data-more]').forEach(el => el.hidden = !open);
  e.target.textContent = open ? 'Show fewer projects' : 'Show more projects';
});

// ----- tabs -----
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
  document.querySelectorAll('.pane').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); $('#'+b.dataset.t).classList.add('on');
}));

// ----- mobile menu -----
const menu = $('#menu');
$('#burger').addEventListener('click', () => menu.classList.toggle('open'));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

// ----- contact form -> Google Sheet -----
$('#cform').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, msg = $('#msg');
  msg.textContent = 'Sending...';
  fetch(SCRIPT_URL, {method:'POST', body:new FormData(f)})
    .then(() => { msg.textContent = 'Message sent. I will reply soon.'; f.reset(); })
    .catch(() => { msg.textContent = 'Could not send. Please email me directly.'; });
});

$('#yr').textContent = new Date().getFullYear();
