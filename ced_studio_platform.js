const { useState, useEffect, useMemo, useCallback } = React
const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } = Recharts

// ═══════════════════════════════════════════════════════════
// CED AFRICA — AV DESIGN STUDIO PLATFORM v1.0
// Multi-user · Quote workflow · Performance dashboard
// Storage: window.storage (persistent across sessions)
// ═══════════════════════════════════════════════════════════

const AMBER = "#D97706"
const VAT = 0.075

// ── Colours ──────────────────────────────────────────────
const C = {
  bg:"#ffffff", bg2:"#f8f7f5", bg3:"#f0ede8",
  text:"#1a1a1a", text2:"#4a4a4a", text3:"#888888",
  border:"#d0cfc9", border2:"#e5e4e0",
  red:"#DC2626", green:"#16A34A", blue:"#2563EB", purple:"#7C3AED",
  amber:AMBER,
}

// Status config
const STATUS = {
  draft:            { label:"Draft",           color:"#888",    bg:"#f0f0f0" },
  pending_approval: { label:"Pending Approval", color:"#D97706", bg:"#fffbeb" },
  approved:         { label:"Approved",         color:"#16A34A", bg:"#f0fdf4" },
  rejected:         { label:"Rejected",         color:"#DC2626", bg:"#fef2f2" },
  sent:             { label:"Sent to Client",   color:"#2563EB", bg:"#eff6ff" },
  accepted:         { label:"Client Accepted",  color:"#7C3AED", bg:"#f5f3ff" },
  declined:         { label:"Client Declined",  color:"#888",    bg:"#f9f9f9" },
}

// ── Sub-systems ───────────────────────────────────────────
const SYSTEMS = [
  {id:"sec",  label:"Security System (Intrusion)", short:"Sec",  cat:"Security"},
  {id:"fire", label:"Safety System (Fire Alarm)",  short:"Fire", cat:"Security"},
  {id:"icom", label:"IP Intercom",                 short:"Icom", cat:"Security"},
  {id:"tel",  label:"IP Telephony",                short:"Tel",  cat:"Security"},
  {id:"cctv", label:"IP Surveillance (CCTV)",      short:"CCTV", cat:"Security"},
  {id:"acc",  label:"Access Control",              short:"Acc",  cat:"Security"},
  {id:"ltg",  label:"Smart Lighting",              short:"Ltg",  cat:"Comfort"},
  {id:"hvac", label:"Climate Control",             short:"Hvac", cat:"Comfort"},
  {id:"blind",label:"Window Treatment",            short:"Blind",cat:"Comfort"},
  {id:"audio",label:"Multi-Room Audio",            short:"Audio",cat:"AV"},
  {id:"video",label:"Multi-Room Video",            short:"Video",cat:"AV"},
  {id:"media",label:"Media Room AV",               short:"Media",cat:"AV"},
  {id:"ctrl", label:"Home Control System",         short:"Ctrl", cat:"AV"},
  {id:"net",  label:"Network Infrastructure",      short:"Net",  cat:"Infra"},
  {id:"pwr",  label:"Power Management",            short:"Pwr",  cat:"Infra"},
]

const DEF_RATES = {
  s1:{sec:.10,fire:.10,icom:.20,tel:.30,cctv:.10,acc:.10,ltg:.20,hvac:.20,blind:.20,audio:.30,video:.20,media:.40,ctrl:.20,net:.20,pwr:.10},
  s2:{sec:.10,fire:.10,icom:.10,tel:.10,cctv:.30,acc:.30,ltg:.30,hvac:.30,blind:.30,audio:.35,video:.35,media:.40,ctrl:.20,net:.25,pwr:.10},
  s3:{sec:.10,fire:.10,icom:.10,tel:.10,cctv:.20,acc:.60,ltg:.60,hvac:.50,blind:.50,audio:.50,video:.50,media:.70,ctrl:.10,net:.50,pwr:.15},
}

const DEF_SIZE_TIERS = [
  {id:"S",label:"Small", hint:"<12m²",   max:12,   mult:1.00},
  {id:"M",label:"Medium",hint:"12–25m²", max:25,   mult:1.10},
  {id:"L",label:"Large", hint:">25m²",   max:9999, mult:1.25},
]

// ── Home Cinema Module constants ─────────────────────────
// HC uses wider size thresholds and a higher Large multiplier (1.40×)
// to reflect the specialist complexity of a large dedicated cinema space.
const CINEMA_TIERS = [
  {id:"S",label:"Small", hint:"<25m²",   max:25,   mult:1.00},
  {id:"M",label:"Medium",hint:"25–40m²", max:40,   mult:1.10},
  {id:"L",label:"Large", hint:">40m²",   max:9999, mult:1.40},
]
// Runtime: inherit M multiplier from global; L is cinema-specific at 1.40×
const getCinemaTiers = (globalTiers=DEF_SIZE_TIERS) => CINEMA_TIERS.map(ct=>({
  ...ct,
  mult: ct.id==="S" ? 1.00
      : ct.id==="M" ? (globalTiers.find(gt=>gt.id==="M")?.mult ?? 1.10)
      : 1.40   // Large cinema — fixed override, not inherited
}))
// 3D Render hours added to S1 by size tier (render hrs already encode complexity)
const CINEMA_RENDER_HRS = {S:4, M:6, L:8}

const MAP = {
  "Main Living":[1,1,1,1,1,0,1,1,1,1,1,0,1,1,0],"Other Living":[1,1,0,0,1,0,1,1,0,1,1,0,0,1,0],
  "Dining":[1,1,0,0,1,0,1,1,0,1,0,0,0,0,0],"Media Room":[1,1,0,0,1,0,1,1,1,1,1,1,1,1,0],
  "HiFi Room":[0,0,0,0,0,0,1,1,1,1,1,1,1,1,0],"Main Bedroom":[1,1,1,1,0,0,1,1,1,1,1,0,1,0,0],
  "Other Bedroom":[0,1,0,0,0,0,1,1,0,1,1,0,0,0,0],"Main Ensuite":[0,1,0,0,0,0,1,1,0,1,0,0,0,0,0],
  "Other Ensuite":[0,1,0,0,0,0,1,0,0,0,0,0,0,0,0],"Main WIC":[0,0,0,0,0,0,1,0,0,1,0,0,0,0,0],
  "Other WIC":[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],"Kids Bedroom":[0,1,0,0,1,0,1,1,0,1,1,0,0,0,0],
  "Gym":[1,1,0,0,1,0,1,1,0,1,1,0,1,1,0],"Wellness Room":[0,1,0,0,0,0,1,1,0,1,0,0,0,0,0],
  "Dry Kitchen":[1,1,0,0,1,0,1,1,0,1,0,0,0,0,0],"Wet Kitchen":[1,1,0,0,1,0,1,1,0,0,0,0,0,0,0],
  "Servant Room":[1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],"Transient Room":[0,1,0,0,0,0,1,0,0,0,0,0,0,0,0],
  "Powder Room":[0,1,0,0,0,0,1,0,0,0,0,0,0,0,0],"Main Terrace":[0,0,0,0,0,0,1,0,0,1,0,0,0,0,0],
  "Other Terrace":[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],"Garden":[0,0,0,0,1,0,1,0,0,1,0,0,0,0,0],
  "Outdoor Patio":[0,0,0,0,1,0,1,0,0,1,0,0,0,0,0],"Swimming Pool":[1,0,0,0,1,0,1,0,0,1,0,0,0,0,0],
  "Exterior":[1,0,0,0,1,0,1,0,0,0,0,0,0,0,0],"Perimeter":[1,0,0,0,1,0,1,0,0,0,0,0,0,0,0],
  "Entrance Foyer":[1,1,1,0,1,0,1,1,1,1,0,0,1,1,0],"Hallway":[1,1,0,0,1,0,1,0,0,1,0,0,0,0,0],
  "Stairs":[1,1,0,0,1,0,1,0,0,0,0,0,0,0,0],"Front Entrance":[1,1,1,0,1,1,1,0,0,0,0,0,0,0,0],
  "Back Entrance":[1,1,0,0,1,1,1,0,0,0,0,0,0,0,0],"Gate House":[1,1,1,1,1,1,0,0,0,0,1,0,0,1,0],
  "Home Office":[1,1,0,1,0,1,1,1,1,1,1,0,1,1,0],"Home Cinema":[0,0,0,0,0,0,1,0,0,0,0,0,1,0,0],
  "Surveillance Station":[1,1,1,1,1,1,0,0,0,0,1,0,0,0,0],"Safe Room":[1,1,1,1,1,1,1,0,0,0,1,0,0,0,0],
  "Server Room":[1,1,0,1,1,1,1,0,0,0,0,0,0,1,1],"Other Room":[0,1,0,0,0,0,1,0,0,0,0,0,0,0,0],
  "Future Use":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
}
const LOC_TYPES = Object.keys(MAP)

// ── Plain-English Deliverable Descriptions ────────────────
const PLAIN = {
  s1:[
    {title:"Client Discovery & Design Thinking",
     plain:"A structured conversation where we listen to how you live, entertain, and use your home — translating your lifestyle into a clear technology vision before any equipment is specified."},
    {title:"Device Placement Drawings",
     plain:"Floor plan drawings showing the exact position of every device — speakers, screens, keypads, cameras, sensors — in every room, so you can see the full picture before construction begins."},
    {title:"Functional Specification Document",
     plain:"A plain-English description of what each system will do in each space — what happens when you arrive home, press a button, or set a mood scene."},
    {title:"Equipment List",
     plain:"A complete list of every product recommended for your home, organised by room and system — your technology shopping list."},
    {title:"Product Specification Submittal",
     plain:"Technical datasheets for every proposed product, confirming it meets the design intent, quality standard, and compatibility requirements for your project."},
    {title:"Client Presentation Meetings",
     plain:"A formal walk-through of the full design proposal — we present every decision and answer your questions before any commitment is made."},
  ],
  s2:[
    {title:"Rough-In Plan Drawings",
     plain:"Construction drawings issued to your builder showing exactly where pipes, conduits, and cable routes must be built into walls and floors during construction — before plastering or finishing begins."},
    {title:"Room Wall Elevation Drawings",
     plain:"Detailed drawings of each wall showing the precise position, height, and dimensions of every device mounting point, recess, and backbox required — so your builder knows exactly what to build."},
    {title:"Rack Room Elevation Drawing",
     plain:"A layout drawing of the technology equipment room, showing how all devices are organised inside the rack cabinets and on the walls for maximum efficiency and serviceability."},
    {title:"Wire Checklist Schedule",
     plain:"A complete list of every cable to be installed — type, length, routing, labelling — used by the installer as a quality-controlled checklist to ensure nothing is missed during rough-in."},
    {title:"Bill of Materials (BoM)",
     plain:"The final confirmed procurement list of all equipment, cables, and accessories required to build your system — used to purchase everything before installation begins."},
  ],
  s3:[
    {title:"AV Schematic Drawings",
     plain:"Technical wiring diagrams showing how every device connects to every other device — the complete electrical roadmap your installer follows to build the system correctly and to specification."},
    {title:"Rack Elevation Drawings",
     plain:"Precise rack layout drawings confirming the exact position of every device in the equipment cabinets, with heat load, weight distribution, and power calculations verified."},
    {title:"Lighting & Access Control Panel Schematic Drawings",
     plain:"Wiring diagrams for your lighting control system and door access panels — showing every circuit connection, load calculation, and control relationship."},
    {title:"Patch Panel Schematic Drawings",
     plain:"Diagrams of the cable management panels showing which cable connects where — ensuring every connection is labelled, traceable, and easy to service for the lifetime of the system."},
    {title:"Reflected Ceiling Plan Drawings",
     plain:"Ceiling drawings showing the exact position of every ceiling-mounted device — speakers, light fixtures, sensors, cameras, Wi-Fi access points — coordinated with your architect's ceiling design."},
    {title:"AV Power Schedule",
     plain:"A formal power requirements document issued to your electrical engineer, specifying exactly what dedicated circuits, UPS connections, and load capacities each system needs."},
    {title:"SI / Contractor Tender Support",
     plain:"Technical documentation prepared to support the contractor's quotation and procurement process — ensuring every installer bidding on the project works from exactly the same specification."},
  ],
}


// ── Built-in Quote Templates ──────────────────────────────
const DEF_TEMPLATES = [
  {
    id:"tpl-3br",
    name:"3 Bedroom Apartment",
    icon:"🏢",
    desc:"Mid-rise residential apartment. 13 rooms including living, dining, 3 bedrooms, ensuites, kitchen, and balcony.",
    tags:["Apartment","3 Bedroom","Mid-rise"],
    isBuiltIn:true,
    rooms:[
      {name:"Living Room",     locType:"Main Living",    sqm:"35"},
      {name:"Dining Room",     locType:"Dining",         sqm:"18"},
      {name:"Master Bedroom",  locType:"Main Bedroom",   sqm:"25"},
      {name:"Bedroom 2",       locType:"Other Bedroom",  sqm:"16"},
      {name:"Bedroom 3",       locType:"Other Bedroom",  sqm:"14"},
      {name:"Master Ensuite",  locType:"Main Ensuite",   sqm:"8"},
      {name:"Ensuite 2",       locType:"Other Ensuite",  sqm:"6"},
      {name:"Master WIC",      locType:"Main WIC",       sqm:"7"},
      {name:"Kitchen",         locType:"Dry Kitchen",    sqm:"14"},
      {name:"Entrance Foyer",  locType:"Entrance Foyer", sqm:"9"},
      {name:"Hallway",         locType:"Hallway",        sqm:"7"},
      {name:"Guest WC",        locType:"Powder Room",    sqm:"4"},
      {name:"Balcony",         locType:"Main Terrace",   sqm:"10"},
    ]
  },
  {
    id:"tpl-4bt",
    name:"4 Bedroom Terrace",
    icon:"🏘",
    desc:"Duplex or triplex terrace house. 21 rooms including dual living areas, home office, wet and dry kitchens.",
    tags:["Terrace","4 Bedroom","Duplex"],
    isBuiltIn:true,
    rooms:[
      {name:"Main Living Room", locType:"Main Living",    sqm:"42"},
      {name:"Family Lounge",    locType:"Other Living",   sqm:"22"},
      {name:"Dining Room",      locType:"Dining",         sqm:"20"},
      {name:"Master Bedroom",   locType:"Main Bedroom",   sqm:"30"},
      {name:"Bedroom 2",        locType:"Other Bedroom",  sqm:"20"},
      {name:"Bedroom 3",        locType:"Other Bedroom",  sqm:"18"},
      {name:"Bedroom 4",        locType:"Other Bedroom",  sqm:"16"},
      {name:"Master Ensuite",   locType:"Main Ensuite",   sqm:"10"},
      {name:"Ensuite 2",        locType:"Other Ensuite",  sqm:"7"},
      {name:"Ensuite 3",        locType:"Other Ensuite",  sqm:"6"},
      {name:"Ensuite 4",        locType:"Other Ensuite",  sqm:"6"},
      {name:"Master WIC",       locType:"Main WIC",       sqm:"10"},
      {name:"WIC 2",            locType:"Other WIC",      sqm:"6"},
      {name:"Dry Kitchen",      locType:"Dry Kitchen",    sqm:"16"},
      {name:"Wet Kitchen",      locType:"Wet Kitchen",    sqm:"10"},
      {name:"Home Office",      locType:"Home Office",    sqm:"14"},
      {name:"Entrance Foyer",   locType:"Entrance Foyer", sqm:"12"},
      {name:"Hallway",          locType:"Hallway",        sqm:"10"},
      {name:"Stairs",           locType:"Stairs",         sqm:"8"},
      {name:"Guest WC",         locType:"Powder Room",    sqm:"4"},
      {name:"Rear Terrace",     locType:"Main Terrace",   sqm:"14"},
    ]
  },
  {
    id:"tpl-5bv",
    name:"5 Bedroom Villa",
    icon:"🏡",
    desc:"Fully-loaded detached villa. 33 rooms — media room, gym, outdoor areas, gate house, server room, pool.",
    tags:["Villa","5 Bedroom","Detached","Full Smart Home"],
    isBuiltIn:true,
    rooms:[
      {name:"Grand Living Room", locType:"Main Living",    sqm:"65"},
      {name:"Family Lounge",     locType:"Other Living",   sqm:"35"},
      {name:"Formal Dining",     locType:"Dining",         sqm:"30"},
      {name:"Media Room",        locType:"Media Room",     sqm:"28"},
      {name:"Home Office",       locType:"Home Office",    sqm:"22"},
      {name:"Gym",               locType:"Gym",            sqm:"25"},
      {name:"Master Bedroom",    locType:"Main Bedroom",   sqm:"45"},
      {name:"Bedroom 2",         locType:"Other Bedroom",  sqm:"25"},
      {name:"Bedroom 3",         locType:"Other Bedroom",  sqm:"22"},
      {name:"Bedroom 4",         locType:"Other Bedroom",  sqm:"20"},
      {name:"Bedroom 5",         locType:"Other Bedroom",  sqm:"18"},
      {name:"Master Ensuite",    locType:"Main Ensuite",   sqm:"16"},
      {name:"Ensuite 2",         locType:"Other Ensuite",  sqm:"9"},
      {name:"Ensuite 3",         locType:"Other Ensuite",  sqm:"8"},
      {name:"Ensuite 4",         locType:"Other Ensuite",  sqm:"7"},
      {name:"Ensuite 5",         locType:"Other Ensuite",  sqm:"7"},
      {name:"Master WIC",        locType:"Main WIC",       sqm:"16"},
      {name:"WIC 2",             locType:"Other WIC",      sqm:"9"},
      {name:"WIC 3",             locType:"Other WIC",      sqm:"8"},
      {name:"Dry Kitchen",       locType:"Dry Kitchen",    sqm:"22"},
      {name:"Wet Kitchen",       locType:"Wet Kitchen",    sqm:"14"},
      {name:"Entrance Foyer",    locType:"Entrance Foyer", sqm:"22"},
      {name:"Hallway",           locType:"Hallway",        sqm:"14"},
      {name:"Stairs",            locType:"Stairs",         sqm:"10"},
      {name:"Guest WC",          locType:"Powder Room",    sqm:"5"},
      {name:"Guest WC 2",        locType:"Powder Room",    sqm:"4"},
      {name:"Main Terrace",      locType:"Main Terrace",   sqm:"30"},
      {name:"Garden",            locType:"Garden",         sqm:"80"},
      {name:"Swimming Pool",     locType:"Swimming Pool",  sqm:"40"},
      {name:"Gate House",        locType:"Gate House",     sqm:"12"},
      {name:"Server Room",       locType:"Server Room",    sqm:"10"},
      {name:"Exterior",          locType:"Exterior",       sqm:"60"},
      {name:"Perimeter",         locType:"Perimeter",      sqm:"0"},
    ]
  },
  {
    id:"tpl-5bv-cin",
    name:"5 Bedroom Villa + Cinema",
    icon:"🎬",
    desc:"Premium detached villa with dedicated Home Cinema. 34 rooms including full smart home scope plus a medium-sized cinema room with 3D render included.",
    tags:["Villa","5 Bedroom","Home Cinema","Premium"],
    isBuiltIn:true,
    rooms:[
      {name:"Grand Living Room", locType:"Main Living",    sqm:"65"},
      {name:"Family Lounge",     locType:"Other Living",   sqm:"35"},
      {name:"Formal Dining",     locType:"Dining",         sqm:"30"},
      {name:"Home Cinema",       locType:"Home Cinema",    sqm:"32", cinRender:true},
      {name:"Home Office",       locType:"Home Office",    sqm:"22"},
      {name:"Gym",               locType:"Gym",            sqm:"25"},
      {name:"Master Bedroom",    locType:"Main Bedroom",   sqm:"45"},
      {name:"Bedroom 2",         locType:"Other Bedroom",  sqm:"25"},
      {name:"Bedroom 3",         locType:"Other Bedroom",  sqm:"22"},
      {name:"Bedroom 4",         locType:"Other Bedroom",  sqm:"20"},
      {name:"Bedroom 5",         locType:"Other Bedroom",  sqm:"18"},
      {name:"Master Ensuite",    locType:"Main Ensuite",   sqm:"16"},
      {name:"Ensuite 2",         locType:"Other Ensuite",  sqm:"9"},
      {name:"Ensuite 3",         locType:"Other Ensuite",  sqm:"8"},
      {name:"Ensuite 4",         locType:"Other Ensuite",  sqm:"7"},
      {name:"Ensuite 5",         locType:"Other Ensuite",  sqm:"7"},
      {name:"Master WIC",        locType:"Main WIC",       sqm:"16"},
      {name:"WIC 2",             locType:"Other WIC",      sqm:"9"},
      {name:"WIC 3",             locType:"Other WIC",      sqm:"8"},
      {name:"Dry Kitchen",       locType:"Dry Kitchen",    sqm:"22"},
      {name:"Wet Kitchen",       locType:"Wet Kitchen",    sqm:"14"},
      {name:"Entrance Foyer",    locType:"Entrance Foyer", sqm:"22"},
      {name:"Hallway",           locType:"Hallway",        sqm:"14"},
      {name:"Stairs",            locType:"Stairs",         sqm:"10"},
      {name:"Guest WC",          locType:"Powder Room",    sqm:"5"},
      {name:"Guest WC 2",        locType:"Powder Room",    sqm:"4"},
      {name:"Main Terrace",      locType:"Main Terrace",   sqm:"30"},
      {name:"Garden",            locType:"Garden",         sqm:"80"},
      {name:"Swimming Pool",     locType:"Swimming Pool",  sqm:"40"},
      {name:"Gate House",        locType:"Gate House",     sqm:"12"},
      {name:"Server Room",       locType:"Server Room",    sqm:"10"},
      {name:"Exterior",          locType:"Exterior",       sqm:"60"},
      {name:"Perimeter",         locType:"Perimeter",      sqm:"0"},
    ]
  },
]

// ── Stage 4 Deliverables ─────────────────────────────────
// Home Cinema 3D Render deliverable — conditionally shown in S1 when project has cinema rooms
const PLAIN_CINEMA_RENDER = {
  title:"Home Cinema 3D Render Design",
  plain:"A photorealistic three-dimensional render of your Home Cinema space — showing the screen wall, acoustic panel treatment, ambient lighting design, seating arrangement, and speaker positions — giving you a clear visual of the final room before any construction begins."
}

const PLAIN_S4 = [
  {title:"Pre-Construction Coordination Meeting (PCCM)",
   plain:"A formal kickoff meeting held before any site work begins, bringing together the SI contractor, project manager, architect, and M&E consultants. We walk through every drawing, confirm the construction sequence, and establish the communication and approval protocols for the entire delivery phase."},
  {title:"Contractor Submittal Review & Approval",
   plain:"Before the contractor buys or installs anything, they must submit the specific products and materials they propose to use. We review these submittals against our specification — checking that every product meets the design standard — and issue a written approval or rejection before procurement can proceed."},
  {title:"Request for Information (RFI) Management",
   plain:"Throughout construction, contractors will raise technical questions about the drawings. We respond to each RFI in writing within an agreed turnaround time, providing formal clarifications or design instructions so the work on site always reflects the approved design."},
  {title:"First Fix QC Inspection & Gate Sign-Off",
   plain:"An on-site inspection at the rough-in stage — before walls are plastered and ceilings are closed. We verify that every conduit route, cable tray, back-box position, and rack room preparation matches the approved drawings. A signed QC Gate Certificate is issued; work cannot proceed to the next phase without it."},
  {title:"Second Fix QC Inspection & Gate Sign-Off",
   plain:"After devices are mounted and cables are terminated, we return to inspect the quality of every termination, accuracy of cable labelling, completion of patch panels, and dressing of equipment racks. Another signed Gate Certificate is issued before the finish installation phase begins."},
  {title:"Finish Install QC Inspection & Gate Sign-Off",
   plain:"The final pre-commissioning inspection — checking trim plate installation, device alignment, rack equipment seating, and overall installation finish. This gate confirms the installation is ready to be switched on and programmed."},
  {title:"Programming & Commissioning Document Review",
   plain:"Before the system is programmed, the contractor submits their programming documentation — scene lists, automation sequences, schedules — for our review against the UI Programming Schedule approved in Stage 1. We approve so the system is programmed exactly as you agreed, not to the contractor's interpretation."},
  {title:"System Performance & Experience Assurance Verification",
   plain:"A formal walkthrough with you, the client, demonstrating every system feature, lighting scene, automation sequence, and control interface against the original Functional Specification. Any items that do not perform correctly are logged on a Defect Snagging List and tracked until closed. Nothing is signed off until your experience matches what was promised."},
  {title:"Project Close-Out & Handover Package",
   plain:"At practical completion, we collect all close-out documentation from the contractor — as-built drawings, O&M manuals, manufacturer warranties, programming backups, and system access credentials — and deliver a formal Handover Package along with the AV Design Certificate of Practical Completion."},
  {title:"Bi-Weekly Site Coordination Meetings",
   plain:"We attend regular site progress meetings throughout the project lifecycle to maintain design authority on site, keep the AV works aligned with the broader construction programme, and ensure no decisions affecting the technology systems are made without our input. Meeting minutes are recorded and distributed after every session."},
]


const STAGES_META = [
  {id:"s1",num:"01",name:"Concept Design",    sub:"Pre-Sales & Design Intent",           color:"#3B82F6", gate:"Experience Intent"},
  {id:"s2",num:"02",name:"Site Pack",          sub:"Experience Delivery Documentation",   color:"#10B981", gate:"Experience Ready"},
  {id:"s3",num:"03",name:"Engineering Pack",   sub:"Experience Engineering Documentation",color:"#8B5CF6", gate:"Experience Assured"},
]
const S4_META = {id:"s4",num:"04",name:"Project Delivery Governance",sub:"Experience Delivery Governance",color:"#D97706",gate:"Experience Delivery Governance"}

const DEF_EXCLUSIONS = [
  "Architectural, electrical, and mechanical works are not included in this design scope.",
  "Speaker and equipment installation labour is not included in this design fee.",
  "Acoustic treatment works are not included unless specifically scoped and confirmed in writing.",
  "Programming and commissioning of control systems are not included in this design scope.",
  "Cable supply and installation are not included in this design fee.",
  "AV equipment procurement and supply are not included in this design fee.",
  "Any changes to the approved design after Stage 1 sign-off are subject to a formal Variation Order.",
  "Structural modifications required for equipment installation are not in scope.",
  "Generator, inverter, solar, or power infrastructure works are not in scope of this engagement.",
  "Out-of-station costs (travel, accommodation, per diem) for project sites outside Lagos State are excluded from all stage fees and invoiced separately when incurred.",
]

// ── Utilities ─────────────────────────────────────────────
const ngn = n => "₦" + Math.round(n).toLocaleString("en-NG")
const hrs = n => n.toFixed(1) + " hrs"
const hp = p => btoa(unescape(encodeURIComponent(p)))
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6)
const dateStr = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—"
const timeStr = d => new Date(d).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})
const diffHrs = (a,b) => a&&b ? ((b-a)/3600000).toFixed(1) : null
const diffDays = (a,b) => a&&b ? ((b-a)/86400000).toFixed(1) : null

const getSizeTier = (sqm, tiers=DEF_SIZE_TIERS) => {
  const s = parseFloat(sqm)||0
  for (const t of tiers.slice(0,-1)) { if (s < t.max) return t.id }
  return tiers[tiers.length-1].id
}
const getSizeMult = (sqm, tiers=DEF_SIZE_TIERS) => tiers.find(t=>t.id===getSizeTier(sqm,tiers))?.mult||1.0

// ── Calculation engine ─────────────────────────────────────
function calcQuote(rooms, mapOv, cfg, settings) {
  const rates = settings.rates||{}
  const tiers = settings.sizeTiers||DEF_SIZE_TIERS
  const getR = (st, sid) => rates[st]?.[sid] ?? DEF_RATES[st]?.[sid] ?? 0
  const getMap = (lt,idx) => mapOv[lt]?.[idx]!==undefined ? mapOv[lt][idx] : !!(MAP[lt]?.[idx])
  const RATE = settings.rate||80000

  const valid = rooms.filter(r=>r.locType)
  const types = [...new Set(valid.map(r=>r.locType))]
  const count={}, sqmS={}, sqmC={}
  valid.forEach(r=>{
    count[r.locType]=(count[r.locType]||0)+1
    if(r.sqm){sqmS[r.locType]=(sqmS[r.locType]||0)+parseFloat(r.sqm);sqmC[r.locType]=(sqmC[r.locType]||0)+1}
  })
  const avg={}; Object.keys(sqmS).forEach(lt=>avg[lt]=sqmS[lt]/sqmC[lt])

  const stageHrs={s1:0,s2:0,s3:0}
  const detail={}

  SYSTEMS.forEach((sys,idx)=>{
    let s1=0,s2=0,s3=0
    types.forEach(lt=>{
      if(!getMap(lt,idx))return
      const n=count[lt]||0, mult=getSizeMult(avg[lt]||0,tiers)
      s1+=getR("s1",sys.id)*n*mult
      s2+=getR("s2",sys.id)*n*mult
      s3+=getR("s3",sys.id)*n*mult
    })
    const total=s1+s2+s3
    if(total>0){
      stageHrs.s1+=s1;stageHrs.s2+=s2;stageHrs.s3+=s3
      detail[sys.id]={h:total,label:sys.label,stages:{s1,s2,s3}}
    }
  })

  // Home Cinema — dedicated calculation with HC-specific tiers + 3D render
  // S1 = (8 base × size_mult) + render_hrs(S:4 / M:6 / L:8)
  // S2 = 12 base × size_mult
  // S3 = 9  base × size_mult
  // Large multiplier is cinema-specific 1.40× (not global 1.25×)
  const cinRooms = valid.filter(r=>r.locType==="Home Cinema")
  if(cinRooms.length>0){
    const cinemaTiers = (settings.cinemaTiers||CINEMA_TIERS).map(ct=>({...ct}))
    const cHrs = settings.cinemaHrs||{s1:8,s2:12,s3:9}
    let s1=0,s2=0,s3=0
    cinRooms.forEach(r=>{
      const mult   = getSizeMult(parseFloat(r.sqm)||0, cinemaTiers)
      const tierId = getSizeTier(parseFloat(r.sqm)||0, cinemaTiers)
      const renderHrs = r.cinRender ? (CINEMA_RENDER_HRS[tierId]||4) : 0
      s1 += (cHrs.s1*mult) + renderHrs
      s2 += cHrs.s2*mult
      s3 += cHrs.s3*mult
    })
    stageHrs.s1+=s1;stageHrs.s2+=s2;stageHrs.s3+=s3
    detail["cinema"]={h:s1+s2+s3,label:"Home Cinema",stages:{s1,s2,s3}}
  }

  const totalH = Object.values(detail).reduce((a,d)=>a+d.h,0)
  const stageList = STAGES_META.map(st=>({...st,hours:stageHrs[st.id]||0,fee:(stageHrs[st.id]||0)*RATE}))
  const subtotal = totalH*RATE
  const discAmt = subtotal*(cfg.discount/100)
  const afterDisc = subtotal-discAmt
  const vatAmt = afterDisc*VAT
  const grand = afterDisc+vatAmt

  // Stage 4 retainer
  const s4Floor = settings.s4Floor||1000000
  const s4Pct = settings.s4Pct||0.001
  const s4Monthly = Math.max(s4Floor, (cfg.avSystemValue||0)*s4Pct)
  const s4Total = cfg.s4Included ? s4Monthly*(cfg.s4Months||1) : 0

  const s1Fee = stageHrs.s1*RATE
  return {detail,totalH,stageList,stageHrs,subtotal,discAmt,afterDisc,vatAmt,grand,s4Monthly,s4Total,RATE,s1Fee}
}

// ── Storage layer ──────────────────────────────────────────
// ── Storage layer ─────────────────────────────────────────────
// Auto-detects environment: uses window.storage (Claude artifact)
// when available, falls back to localStorage (live/deployed environment).
const store = {
  async get(key) {
    try {
      if (window.storage) {
        const r = await window.storage.get(key)
        return r ? JSON.parse(r.value) : null
      }
      const v = localStorage.getItem(key)
      return v ? JSON.parse(v) : null
    } catch { return null }
  },
  async set(key, val) {
    try {
      if (window.storage) {
        await window.storage.set(key, JSON.stringify(val))
      } else {
        localStorage.setItem(key, JSON.stringify(val))
      }
      return true
    } catch { return false }
  },
  async getSettings() {
    const s = await this.get("ced_settings")
    return s || {rate:80000,rates:{},sizeTiers:DEF_SIZE_TIERS.map(t=>({...t})),cinemaTiers:CINEMA_TIERS.map(t=>({...t})),cinemaHrs:{s1:8,s2:12,s3:9},s4Floor:1000000,s4Pct:0.001,exclusions:[...DEF_EXCLUSIONS],adminPwd:hp("ADMIN@CED"),studioEmail:"design@ced.africa",leadEmail:"tonyemelukwe@ced.africa",recoveryCode:hp("CEDRECOVER")}
  },
  async getUsers() { return await this.get("ced_users") || [] },
  async getQuotes() { return await this.get("ced_quotes") || [] },
  async saveSettings(s) { return this.set("ced_settings",s) },
  async saveUsers(u) { return this.set("ced_users",u) },
  async saveQuotes(q) { return this.set("ced_quotes",q) },
  async getSpecifiers() { return await this.get("ced_specifiers") || [] },
  async saveSpecifiers(s) { return this.set("ced_specifiers",s) },
  async getDiscoveries() { return await this.get("ced_discoveries") || [] },
  async saveDiscoveries(d) { return this.set("ced_discoveries",d) },
}

// ── Shared UI ──────────────────────────────────────────────
const inp = (extra={}) => ({width:"100%",padding:"9px 12px",borderRadius:8,fontSize:13,boxSizing:"border-box",border:`1px solid ${C.border}`,background:C.bg,color:C.text,outline:"none",fontFamily:"inherit",...extra})
const IL = ({label,hint,children,style:s}) => (
  <div style={{marginBottom:12,...s}}>
    <label style={{display:"block",fontSize:12,fontWeight:500,color:C.text2,marginBottom:hint?3:5}}>{label}</label>
    {hint&&<div style={{fontSize:11,color:C.text3,marginBottom:4,lineHeight:1.5}}>{hint}</div>}
    {children}
  </div>
)
const TI = ({value,onChange,placeholder,type="text",style:s}) => <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...inp(),...s}}/>
const Sel = ({value,onChange,options,placeholder}) => (
  <select value={value} onChange={e=>onChange(e.target.value)} style={inp()}>
    {placeholder&&<option value="">{placeholder}</option>}
    {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
  </select>
)
const NI = ({value,onChange,min=0,max=9999}) => (
  <input type="number" min={min} max={max} value={value} onChange={e=>onChange(Math.max(min,Math.min(max,parseFloat(e.target.value)||min)))} style={inp({textAlign:"center"})}/>
)
const Btn = ({onClick,children,variant="primary",small,disabled,style:s}) => {
  const base = {padding:small?"6px 14px":"10px 20px",borderRadius:8,fontSize:small?12:14,fontWeight:500,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,border:"none",...s}
  const vars = {primary:{background:AMBER,color:"#fff"},outline:{background:"transparent",color:AMBER,border:`1px solid ${AMBER}`},ghost:{background:C.bg2,color:C.text2,border:`1px solid ${C.border}`},danger:{background:C.red,color:"#fff"},success:{background:C.green,color:"#fff"},blue:{background:C.blue,color:"#fff"}}
  return <button onClick={!disabled?onClick:undefined} style={{...base,...vars[variant]}}>{children}</button>
}
const Badge = ({status}) => {
  const s = STATUS[status]||STATUS.draft
  return <span style={{display:"inline-block",padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:600,color:s.color,background:s.bg,border:`1px solid ${s.color}30`}}>{s.label}</span>
}
const Card = ({children,style:s}) => <div style={{border:`1px solid ${C.border}`,borderRadius:12,background:C.bg,overflow:"hidden",...s}}>{children}</div>
const SectionTitle = ({children}) => <div style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>{children}</div>

// ── Login Screen ───────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [email,setEmail]=useState("")
  const [pwd,setPwd]=useState("")
  const [err,setErr]=useState("")
  const [loading,setLoading]=useState(false)
  const [view,setView]=useState("login") // login | forgot | recovery
  const [forgotEmail,setForgotEmail]=useState("")
  const [forgotMsg,setForgotMsg]=useState("")
  const [recoveryInput,setRecoveryInput]=useState("")
  const [newPwd,setNewPwd]=useState("")
  const [confirmPwd,setConfirmPwd]=useState("")
  const [recoveryErr,setRecoveryErr]=useState("")
  const [recoveryOk,setRecoveryOk]=useState(false)

  const submit = async () => {
    setErr(""); setLoading(true)
    const users = await store.getUsers()
    const user = users.find(u=>u.email.toLowerCase()===email.toLowerCase())
    if (!user) { setErr("No account found with this email address."); setLoading(false); return }
    if (!user.active) { setErr("This account has been deactivated. Contact your Studio Lead."); setLoading(false); return }
    if (user.password !== hp(pwd)) { setErr("Incorrect password."); setLoading(false); return }
    await store.set("ced_session", {userId:user.id, role:user.role, name:user.name, email:user.email, loginAt:Date.now()})
    onLogin(user)
    setLoading(false)
  }

  const handleForgot = async () => {
    if(!forgotEmail.trim()){setForgotMsg("Please enter your email address.");return}
    const users = await store.getUsers()
    const settings = await store.getSettings()
    const user = users.find(u=>u.email.toLowerCase()===forgotEmail.toLowerCase())
    if(!user){setForgotMsg("No account found with this email address.");return}
    const leadEmail = settings.leadEmail||"tonyemelukwe@ced.africa"
    if(user.role==="lead"){
      // Lead uses recovery code flow
      setView("recovery")
    } else {
      // Designer: open mailto to lead
      const subject = encodeURIComponent("Password Reset Request -- "+user.name)
      const body = encodeURIComponent([
        "Dear Studio Lead,",
        "",
        user.name+" ("+user.email+") has requested a password reset.",
        "",
        "Please log in to the Admin Panel > User Accounts and reset their password.",
        "",
        "CED Africa AV Design Studio",
      ].join("\r\n"))

      const a=document.createElement("a")
      a.href="mailto:"+leadEmail+"?subject="+subject+"&body="+body
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setForgotMsg("A password reset request has been sent to the Studio Lead. They will reset your password and share the new one with you.")
    }
  }

  const handleRecovery = async () => {
    setRecoveryErr("")
    if(!recoveryInput){setRecoveryErr("Enter your recovery code.");return}
    const settings = await store.getSettings()
    if(hp(recoveryInput)!==(settings.recoveryCode||hp("CEDRECOVER"))){setRecoveryErr("Incorrect recovery code.");return}
    if(!newPwd||newPwd.length<6){setRecoveryErr("New password must be at least 6 characters.");return}
    if(newPwd!==confirmPwd){setRecoveryErr("Passwords do not match.");return}
    // Reset the lead account password
    const users = await store.getUsers()
    const lead = users.find(u=>u.role==="lead")
    if(!lead){setRecoveryErr("Lead account not found.");return}
    const updated = users.map(u=>u.id===lead.id?{...u,password:hp(newPwd)}:u)
    await store.saveUsers(updated)
    setRecoveryOk(true)
    setTimeout(()=>{ setView("login"); setRecoveryOk(false); setRecoveryInput(""); setNewPwd(""); setConfirmPwd("") },3000)
  }

  const header = (
    <div style={{textAlign:"center",marginBottom:32}}>
      <div style={{display:"inline-block",background:AMBER,color:"#fff",fontSize:13,fontWeight:700,padding:"4px 14px",borderRadius:6,letterSpacing:".07em",marginBottom:12}}>CED AFRICA</div>
      <h1 style={{fontSize:24,fontWeight:700,color:C.text,margin:0}}>AV Design Studio</h1>
    </div>
  )

  if(view==="forgot") return (
    <div style={{minHeight:"100vh",background:C.bg2,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400}}>
        {header}
        <Card style={{padding:28}}>
          <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:4}}>Reset Password</div>
          <div style={{fontSize:13,color:C.text2,marginBottom:18}}>Enter your account email. Designers will receive a reset request via the Studio Lead. The Studio Lead uses a recovery code.</div>
          {forgotMsg?(
            <div style={{padding:"10px 14px",borderRadius:8,background:"#F0FDF4",border:`1px solid ${C.green}40`,color:C.green,fontSize:13,marginBottom:16,lineHeight:1.6}}>{forgotMsg}</div>
          ):(
            <>
              <IL label="Email Address">
                <TI value={forgotEmail} onChange={setForgotEmail} placeholder="your@email.com" type="email"/>
              </IL>
              <Btn onClick={handleForgot} disabled={!forgotEmail} style={{width:"100%",marginTop:4}}>Continue</Btn>
            </>
          )}
          <div style={{textAlign:"center",marginTop:14}}>
            <button onClick={()=>{setView("login");setForgotMsg("");setForgotEmail("")}} style={{background:"none",border:"none",color:AMBER,fontSize:13,cursor:"pointer"}}>Back to Sign In</button>
          </div>
        </Card>
      </div>
    </div>
  )

  if(view==="recovery") return (
    <div style={{minHeight:"100vh",background:C.bg2,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400}}>
        {header}
        <Card style={{padding:28}}>
          <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:4}}>Studio Lead Recovery</div>
          <div style={{fontSize:13,color:C.text2,marginBottom:18}}>Enter your recovery code (set in Admin Panel → Security) and a new password.</div>
          {recoveryOk&&<div style={{padding:"10px 14px",borderRadius:8,background:"#F0FDF4",border:`1px solid ${C.green}40`,color:C.green,fontSize:13,marginBottom:16}}>✓ Password reset successfully. Redirecting to sign in...</div>}
          {recoveryErr&&<div style={{padding:"10px 14px",borderRadius:8,background:"#fef2f2",border:`1px solid ${C.red}40`,color:C.red,fontSize:13,marginBottom:16}}>{recoveryErr}</div>}
          {!recoveryOk&&(
            <>
              <IL label="Recovery Code">
                <TI value={recoveryInput} onChange={setRecoveryInput} placeholder="Your recovery code" type="password" style={{letterSpacing:"0.1em"}}/>
              </IL>
              <IL label="New Password">
                <TI value={newPwd} onChange={setNewPwd} placeholder="Min. 6 characters" type="password" style={{letterSpacing:"0.1em"}}/>
              </IL>
              <IL label="Confirm New Password">
                <TI value={confirmPwd} onChange={setConfirmPwd} placeholder="Repeat new password" type="password" style={{letterSpacing:"0.1em"}}/>
              </IL>
              <Btn onClick={handleRecovery} disabled={!recoveryInput||!newPwd||!confirmPwd} style={{width:"100%",marginTop:4}}>Reset Password</Btn>
            </>
          )}
          <div style={{textAlign:"center",marginTop:14}}>
            <button onClick={()=>{setView("login");setRecoveryErr("");setRecoveryInput("");setNewPwd("");setConfirmPwd("")}} style={{background:"none",border:"none",color:AMBER,fontSize:13,cursor:"pointer"}}>Back to Sign In</button>
          </div>
        </Card>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:"100vh",background:C.bg2,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400}}>
        {header}
        <p style={{textAlign:"center",color:C.text3,margin:"-20px 0 24px",fontSize:14}}>Sign in to your designer account</p>
        <Card style={{padding:28}}>
          {err&&<div style={{padding:"10px 14px",borderRadius:8,background:"#fef2f2",border:`1px solid ${C.red}40`,color:C.red,fontSize:13,marginBottom:16}}>{err}</div>}
          <IL label="Email Address">
            <TI value={email} onChange={setEmail} placeholder="designer@cedafrica.com" type="email"/>
          </IL>
          <IL label="Password">
            <TI value={pwd} onChange={setPwd} placeholder="••••••••" type="password" style={{letterSpacing:"0.1em"}}/>
          </IL>
          <Btn onClick={submit} disabled={!email||!pwd||loading} style={{width:"100%",marginTop:8}}>
            {loading?"Signing in...":"Sign In"}
          </Btn>
          <div style={{textAlign:"center",marginTop:14}}>
            <button onClick={()=>setView("forgot")} style={{background:"none",border:"none",color:AMBER,fontSize:13,cursor:"pointer",textDecoration:"underline"}}>Forgot your password?</button>
          </div>
        </Card>
        <p style={{textAlign:"center",fontSize:12,color:C.text3,marginTop:16}}>
          Contact your Studio Lead if you don't have an account.
        </p>
      </div>
    </div>
  )
}

// ── App Shell ──────────────────────────────────────────────
function AppShell({session, onLogout, children, page, setPage}) {
  const nav = [
    {id:"quotes",    label:"Quotes",    icon:"📋"},
    {id:"dashboard", label:"Dashboard", icon:"📊"},
    {id:"discovery",  label:"Discovery",  icon:"🔍"},
    ...(session.role==="lead"?[{id:"admin", label:"Admin", icon:"⚙"}]:[]),
  ]
  return (
    <div style={{minHeight:"100vh",background:C.bg2}}>
      <div style={{background:C.bg,borderBottom:`1px solid ${C.border}`,padding:"0 24px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",gap:0,height:54}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginRight:32}}>
            <div style={{background:AMBER,color:"#fff",fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:4,letterSpacing:".06em"}}>CED</div>
            <span style={{fontSize:14,fontWeight:600,color:C.text}}>Design Studio</span>
            {window.SUPABASE_URL &&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:"#F0FDF4",color:"#16A34A",border:"1px solid #16A34A40",letterSpacing:".04em"}}>☁ LIVE</span>}
          </div>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)}
              style={{padding:"0 16px",height:"100%",border:"none",background:"transparent",fontSize:13,fontWeight:500,cursor:"pointer",
                color:page===n.id?AMBER:C.text2,borderBottom:page===n.id?`2px solid ${AMBER}`:"2px solid transparent",
                display:"flex",alignItems:"center",gap:6}}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:500,color:C.text}}>{session.name}</div>
              <div style={{fontSize:11,color:C.text3}}>{session.role==="lead"?"Studio Lead":"AV Designer"}</div>
            </div>
            <button onClick={onLogout} style={{padding:"6px 12px",borderRadius:7,border:`1px solid ${C.border}`,background:C.bg2,color:C.text3,fontSize:12,cursor:"pointer"}}>Sign Out</button>
          </div>
        </div>
      </div>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"28px 24px"}}>
        {children}
      </div>
    </div>
  )
}

// ── Quotes List ────────────────────────────────────────────

// ── Template Picker Modal ─────────────────────────────────
function TemplatePicker({allTemplates, onSelect, onScratch, onClose}) {
  const [preview,setPreview] = useState(null)
  const tpl = preview ? allTemplates.find(t=>t.id===preview) : null

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.bg,borderRadius:14,width:"100%",maxWidth:860,maxHeight:"88vh",overflowY:"auto",border:`1px solid ${C.border}`,display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.border2}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>Start from a Template</h2>
            <p style={{margin:"3px 0 0",fontSize:13,color:C.text2}}>Pre-built room configurations for common residential project types</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",fontSize:18,cursor:"pointer",color:C.text3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:preview?"1fr 1fr":"1fr",flex:1,overflow:"hidden"}}>

          {/* Template cards */}
          <div style={{padding:20,overflowY:"auto"}}>

            {/* Blank start */}
            <div onClick={onScratch}
              style={{padding:16,borderRadius:10,border:`2px dashed ${C.border}`,marginBottom:16,cursor:"pointer",display:"flex",alignItems:"center",gap:14,transition:"border-color .15s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor=AMBER}
              onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
              <span style={{fontSize:28}}>✏️</span>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:C.text}}>Start from Scratch</div>
                <div style={{fontSize:12,color:C.text2,marginTop:2}}>Build your room list manually — full control over every space</div>
              </div>
              <span style={{marginLeft:"auto",fontSize:13,color:AMBER,fontWeight:600}}>Select →</span>
            </div>

            {/* Built-in templates */}
            {allTemplates.filter(t=>t.isBuiltIn).length>0&&(
              <div style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>CED Standard Templates</div>
            )}
            {allTemplates.filter(t=>t.isBuiltIn).map(t=>(
              <TemplateCard key={t.id} t={t} active={preview===t.id}
                onHover={()=>setPreview(t.id)}
                onSelect={()=>onSelect(t)}/>
            ))}

            {/* Custom templates */}
            {allTemplates.filter(t=>!t.isBuiltIn).length>0&&(
              <>
                <div style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",margin:"16px 0 10px"}}>Saved Custom Templates</div>
                {allTemplates.filter(t=>!t.isBuiltIn).map(t=>(
                  <TemplateCard key={t.id} t={t} active={preview===t.id}
                    onHover={()=>setPreview(t.id)}
                    onSelect={()=>onSelect(t)}/>
                ))}
              </>
            )}
          </div>

          {/* Preview panel */}
          {preview&&tpl&&(
            <div style={{borderLeft:`1px solid ${C.border2}`,padding:20,overflowY:"auto",background:C.bg2}}>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:22,marginBottom:6}}>{tpl.icon}</div>
                <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:3}}>{tpl.name}</div>
                <div style={{fontSize:13,color:C.text2,lineHeight:1.5,marginBottom:8}}>{tpl.desc}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
                  {tpl.tags.map(tag=>(
                    <span key={tag} style={{fontSize:11,padding:"2px 8px",borderRadius:12,background:`${AMBER}15`,border:`1px solid ${AMBER}40`,color:AMBER,fontWeight:500}}>{tag}</span>
                  ))}
                </div>
                <Btn onClick={()=>onSelect(tpl)} style={{width:"100%"}}>Use This Template</Btn>
              </div>

              <div style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>
                {tpl.rooms.length} Rooms
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {tpl.rooms.map((r,i)=>{
                  const tier = !r.sqm||r.sqm==="0" ? "" : parseInt(r.sqm)<12?"S":parseInt(r.sqm)<=25?"M":"L"
                  return(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",borderRadius:6,background:C.bg,border:`1px solid ${C.border2}`}}>
                      <span style={{fontSize:12,color:C.text,fontWeight:500}}>{r.name}</span>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <span style={{fontSize:11,color:C.text3}}>{r.locType}</span>
                        {r.sqm&&r.sqm!=="0"&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:4,background:`${AMBER}15`,color:AMBER,fontWeight:600}}>{tier} {r.sqm}m²</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TemplateCard({t, active, onHover, onSelect}) {
  const tierCount = t.rooms.reduce((a,r)=>{
    const s=parseInt(r.sqm)||0
    const tier=s<12?"S":s<=25?"M":"L"
    a[tier]=(a[tier]||0)+1; return a
  },{})
  return (
    <div onClick={onSelect} onMouseOver={onHover}
      style={{padding:14,borderRadius:10,border:`2px solid ${active?AMBER:C.border}`,marginBottom:10,cursor:"pointer",
        background:active?`${AMBER}06`:C.bg,transition:"border-color .15s"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <span style={{fontSize:24,flexShrink:0}}>{t.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:2}}>{t.name}</div>
          <div style={{fontSize:12,color:C.text2,marginBottom:8,lineHeight:1.4}}>{t.desc}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:12,color:C.text3}}>{t.rooms.length} rooms</span>
            {Object.entries(tierCount).map(([tier,n])=>(
              <span key={tier} style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:`${AMBER}12`,color:AMBER,fontWeight:600}}>{n}{tier}</span>
            ))}
          </div>
        </div>
        <span style={{fontSize:13,color:AMBER,fontWeight:600,flexShrink:0}}>Select →</span>
      </div>
    </div>
  )
}

// ── CSV Export ────────────────────────────────────────────────
function exportQuotesCSV(quotes) {
  const headers = [
    "Ref","Project","Client","Designer","Status","Quote Type",
    "Total Hours","Design Fee (NGN)","VAT (NGN)","Grand Total (NGN)",
    "S4 Included","S4 Monthly (NGN)","Discount %",
    "Created","Submitted","Approved","Sent","Version"
  ]
  const rows = quotes.map(q => {
    const calc = calcQuote(q.rooms||[], q.mapOv||{}, q.cfg||{}, {
      rate: q.rateOverride||80000,
      sizeTiers: DEF_SIZE_TIERS,
      s4Floor: 1000000,
      s4Pct: 0.001
    })
    const d = v => v ? new Date(v).toLocaleDateString("en-GB") : ""
    return [
      q.ref||"",
      q.projectName||"",
      q.proj?.client||"",
      q.designerName||"",
      q.status||"",
      q.quoteType||"residential",
      calc.totalH.toFixed(1),
      Math.round(calc.subtotal),
      Math.round(calc.vatAmt),
      Math.round(calc.grand),
      q.cfg?.s4Included?"Yes":"No",
      q.cfg?.s4Included?Math.round(calc.s4Monthly):"",
      q.cfg?.discount||0,
      d(q.createdAt),
      d(q.submittedAt),
      d(q.approvedAt),
      d(q.sentAt),
      q.version||1
    ]
  })
  const esc = v => `"${String(v).replace(/"/g,'""')}"`
  const csv = [headers, ...rows].map(r => r.map(esc).join(",")).join("\r\n")
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"})
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `CED_Quotes_Export_${new Date().toISOString().slice(0,10).replace(/-/g,"")}.csv`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

function QuotesList({session, settings, onNew, onOpen, onExport}) {
  const [quotes,setQuotes]=useState([])
  const [filter,setFilter]=useState("all")
  const [search,setSearch]=useState("")
  const [loading,setLoading]=useState(true)

  useEffect(()=>{ store.getQuotes().then(q=>{ setQuotes(q); setLoading(false) }) },[])

  const mine = session.role==="lead" ? quotes : quotes.filter(q=>q.designerId===session.userId)
  const filtered = mine.filter(q=>{
    if (filter!=="all" && q.status!==filter) return false
    if (search && !q.projectName?.toLowerCase().includes(search.toLowerCase()) && !q.client?.toLowerCase().includes(search.toLowerCase()) && !q.ref?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))

  const statusCounts = Object.keys(STATUS).reduce((acc,s)=>({...acc,[s]:mine.filter(q=>q.status===s).length}),{})

  if (loading) return <div style={{textAlign:"center",padding:60,color:C.text3}}>Loading quotes...</div>

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,color:C.text}}>Quotes</h2>
          <p style={{margin:"4px 0 0",color:C.text2,fontSize:14}}>{session.role==="lead"?"All studio quotes":"Your quotes"}</p>
        </div>
        <Btn onClick={onNew}>+ New Quote</Btn>
              {session.role==="lead"&&quotes.length>0&&(
                <Btn onClick={onExport} variant="ghost" small>⬇ Export CSV</Btn>
              )}
      </div>

      {/* Status filter tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
        {[["all","All",mine.length],...Object.entries(STATUS).map(([k,v])=>[k,v.label,statusCounts[k]])].map(([k,label,count])=>(
          <button key={k} onClick={()=>setFilter(k)}
            style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap",
              border:`1px solid ${filter===k?AMBER:C.border}`,
              background:filter===k?`${AMBER}15`:C.bg,
              color:filter===k?AMBER:C.text2}}>
            {label} {count>0&&<span style={{opacity:.7}}>({count})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by project, client, or reference..." style={{...inp(),maxWidth:360}}/>
      </div>

      {/* Table */}
      {filtered.length===0 ? (
        <Card style={{padding:48,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <div style={{fontSize:15,color:C.text,fontWeight:500}}>No quotes found</div>
          <div style={{fontSize:13,color:C.text3,marginTop:4}}>
            {filter==="all"?"Create your first quote to get started.":"No quotes with this status."}
          </div>
        </Card>
      ) : (
        <Card>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:C.bg2}}>
                {["Reference","Project","Client","Designer","Status","Created","Actions"].map((h,i)=>(
                  <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:600,color:C.text3,textAlign:i>=5?"center":"left",textTransform:"uppercase",letterSpacing:".05em",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((q,i)=>(
                <tr key={q.id} style={{borderTop:i>0?`1px solid ${C.border2}`:"none",background:q.status==="pending_approval"?`${AMBER}06`:q.status==="rejected"?"#fef2f210":"transparent"}}>
                  <td style={{padding:"12px 14px"}}>
                    <div style={{fontSize:12,fontWeight:600,color:AMBER}}>{q.ref}</div>
                    <div style={{fontSize:11,color:C.text3}}>v{q.version||1}</div>
                  </td>
                  <td style={{padding:"12px 14px"}}>
                    <div style={{fontSize:13,fontWeight:500,color:C.text}}>{q.projectName||"Untitled"}</div>
                    {q.status==="rejected"&&<div style={{fontSize:11,color:C.red,marginTop:2}}>⚠ Returned with notes</div>}
                  </td>
                  <td style={{padding:"12px 14px",fontSize:13,color:C.text2}}>{q.client||"—"}</td>
                  <td style={{padding:"12px 14px",fontSize:13,color:C.text2}}>{q.designerName}</td>
                  <td style={{padding:"12px 14px"}}><Badge status={q.status}/></td>
                  <td style={{padding:"12px 14px",fontSize:12,color:C.text3,textAlign:"center"}}>{q.createdAt?dateStr(q.createdAt):"—"}</td>
                  <td style={{padding:"12px 14px",textAlign:"center"}}>
                    <Btn onClick={()=>onOpen(q)} variant="ghost" small>Open</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

// ── Quote Builder ──────────────────────────────────────────
function QuoteBuilder({session, settings, editQuote, convertFromQuote, discoverySeed, templateRooms, customTemplates=[], onSaveTemplate, onSave, onCancel}) {
  const isEdit = !!editQuote
  const dateNow = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})
  const [step,setStep]=useState(1)
  const [proj,setProj]=useState(()=>{
    if(editQuote?.proj) return editQuote.proj
    if(convertFromQuote){
      const sp=convertFromQuote.proj||{}
      return {
        name:sp.name||convertFromQuote.projectName||"",
        client:"",address:sp.address||"",
        designer:session.name,date:dateNow,
        ref:`CED/AVC/${new Date().getFullYear()}/${String(Math.floor(Math.random()*900)+100)}`,
        quoteType:"residential",
        ownerName:"",ownerEmail:"",ownerPhone:"",
        archCompany:sp.archCompany||"",archContact:sp.archContact||"",archEmail:sp.archEmail||"",archPhone:sp.archPhone||"",
        mepCompany:sp.mepCompany||"",mepContact:sp.mepContact||"",mepEmail:sp.mepEmail||"",mepPhone:sp.mepPhone||"",
        specifierId:"",specifierType:"",
      }
    }
    if(discoverySeed) return {...discoverySeed, designer:session.name, date:dateNow}
    return {name:"",client:"",address:"",designer:session.name,date:dateNow,
      ref:`CED/AVC/${new Date().getFullYear()}/${String(Math.floor(Math.random()*900)+100)}`,
      quoteType:"residential",
      ownerName:"",ownerEmail:"",ownerPhone:"",
      archCompany:"",archContact:"",archEmail:"",archPhone:"",
      mepCompany:"",mepContact:"",mepEmail:"",mepPhone:"",
      specifierId:"",specifierType:""}
  })
  const [rooms,setRooms]=useState(()=>{
    if (editQuote?.rooms) return editQuote.rooms
    if (templateRooms && templateRooms.length > 0) return templateRooms.map(r=>({...r, id:uid()}))
    return [{id:uid(),name:"",locType:"",sqm:""}]
  })
  const [templateBadge]  = useState(!!templateRooms)
  const [specifiers,setSpecifiers] = useState([])
  const [specSearch,setSpecSearch] = useState("")
  const [showSpecPicker,setShowSpecPicker] = useState(false)
  const [newSpec,setNewSpec] = useState({type:"architect",company:"",contact:"",email:"",phone:""})
  const [addingSpec,setAddingSpec] = useState(false)
  const [specRejNotes,setSpecRejNotes] = useState({})
  const [pendingSubmitted,setPendingSubmitted] = useState(null)
  const [showSaveTemplate,setShowSaveTemplate] = useState(false)
  const [tplName,setTplName]   = useState("")
  const [tplDesc,setTplDesc]   = useState("")
  const [mapOv,setMapOv]=useState(editQuote?.mapOv||{})
  const [cfg,setCfg]=useState(editQuote?.cfg||{discount:0,s4Included:false,s4Months:6,avSystemValue:0,notes:""})

    const isSpecifier = (proj.quoteType||"residential")==="specifier"

  const updP=(k,v)=>setProj(p=>({...p,[k]:v}))
  const updC=(k,v)=>setCfg(c=>({...c,[k]:v}))
  const addRoom=()=>setRooms(r=>[...r,{id:uid(),name:"",locType:"",sqm:""}])
  const remRoom=id=>setRooms(r=>r.length>1?r.filter(x=>x.id!==id):r)
  const updRoom=(id,k,v)=>setRooms(r=>r.map(x=>x.id===id?{...x,[k]:v}:x))
  const getMap=(lt,idx)=>mapOv[lt]?.[idx]!==undefined?mapOv[lt][idx]:!!(MAP[lt]?.[idx])
  const togMap=(lt,idx)=>setMapOv(o=>({...o,[lt]:{...(o[lt]||{}),[idx]:!getMap(lt,idx)}}))

  useEffect(()=>{ store.getSpecifiers().then(setSpecifiers) },[])
  const validRooms=useMemo(()=>rooms.filter(r=>r.locType),[rooms])
  const presentTypes=useMemo(()=>[...new Set(validRooms.map(r=>r.locType))],[validRooms])
  const byType=useMemo(()=>{
    const count={},sqmS={},sqmC={}
    validRooms.forEach(r=>{count[r.locType]=(count[r.locType]||0)+1;if(r.sqm){sqmS[r.locType]=(sqmS[r.locType]||0)+parseFloat(r.sqm);sqmC[r.locType]=(sqmC[r.locType]||0)+1}})
    const avg={};Object.keys(sqmS).forEach(lt=>avg[lt]=sqmS[lt]/sqmC[lt])
    return {count,avg}
  },[validRooms])

  const tiers = settings.sizeTiers||DEF_SIZE_TIERS
  const calc = useMemo(()=>calcQuote(rooms,mapOv,cfg,settings),[rooms,mapOv,cfg,settings])

  const saveQuote = async (status) => {
    const quotes = await store.getQuotes()
    const now = Date.now()
    const histEntry = {
      timestamp:now,
      action:status==="pending_approval"?"submitted":status==="draft"?"saved":"updated",
      by:session.userId,byName:session.name,notes:"",
      version:(editQuote?.version||1)+(status==="pending_approval"?1:0),
      snapGrand:Math.round(calc.grand),
      snapHours:parseFloat(calc.totalH.toFixed(1)),
      snapRooms:(rooms||[]).filter(r=>r.locType).length
    }
    if (isEdit) {
      const updated = quotes.map(q=>q.id===editQuote.id ? {
        ...q, proj, rooms, mapOv, cfg, calcSnapshot:calc, quoteType:proj.quoteType||"residential",
        status: status||q.status,
        version:(q.version||1)+(status==="pending_approval"?1:0),
        history:[...(q.history||[]),histEntry],
        ...(status==="pending_approval"?{submittedAt:now,rejectionNotes:""}:{})
      } : q)
      await store.saveQuotes(updated)
      onSave(updated.find(q=>q.id===editQuote.id))
    } else {
      const newQ = {
        id:uid(), ref:proj.ref, projectName:proj.name, client:proj.client, quoteType:proj.quoteType||"residential",
        address:proj.address, designerId:session.userId, designerName:session.name,
        status:status||"draft", version:1, proj, rooms, mapOv, cfg, calcSnapshot:calc,
        rateOverride:settings.rate||80000, rateChangeNotice:false,
        convertedFromId:convertFromQuote?.id||null,
        history:[histEntry], createdAt:now,
        submittedAt:status==="pending_approval"?now:null,
        approvedAt:null, sentAt:null, clientResponseAt:null, rejectionNotes:""
      }
      if(newQ.quoteType==="specifier"&&proj.specifierId){
        const specs=await store.getSpecifiers()
        await store.saveSpecifiers(specs.map(s=>s.id===proj.specifierId?{...s,quoteCount:(s.quoteCount||0)+1}:s))
      }
      const finalQuotes = convertFromQuote
        ? [...quotes.map(q=>q.id===convertFromQuote.id?{...q,convertedToId:newQ.id}:q), newQ]
        : [...quotes, newQ]
      await store.saveQuotes(finalQuotes)
      onSave(newQ)
    }
  }

  const canNext = ()=>{
    if(step===1){
      if(!proj.name||!proj.client) return false
      if(isEdit) return true
      if(isSpecifier){
        // Must have selected an APPROVED specifier firm with full details
        if(!proj.specifierId||!proj.specifierType) return false
        const selSpec = specifiers.find(s=>s.id===proj.specifierId)
        if(!selSpec||(selSpec.status||"approved")!=="approved") return false
        if(proj.specifierType==="architect")
          return !!(proj.archCompany&&proj.archContact&&proj.archEmail)
        return !!(proj.mepCompany&&proj.mepContact&&proj.mepEmail)
      }
      // Residential: owner name + email required
      return !!(proj.ownerName&&proj.ownerEmail)
    }
    if(step===2)return validRooms.length>0
    return true
  }

  const stepLabels = ["Project Details","Location Registry","Scope & Config","Preview"]

  return (
    <div style={{maxWidth:960,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text}}>{isEdit?"Edit Quote":"New Quote"}</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.text2}}>{isEdit?`Editing ${editQuote.ref} · v${(editQuote.version||1)+1}`:"Building from scratch"}</p>
        </div>
        <Btn onClick={onCancel} variant="ghost">← Back to Quotes</Btn>
      </div>

      {/* Progress */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",gap:3,marginBottom:5}}>
          {stepLabels.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i+1<step?AMBER:i+1===step?"#FCD34D":C.border2}}/>)}
        </div>
        <div style={{display:"flex",gap:3}}>
          {stepLabels.map((p,i)=><div key={i} style={{flex:1,fontSize:10,textAlign:"center",color:i+1===step?AMBER:C.text3,fontWeight:i+1===step?600:400}}>{p}</div>)}
        </div>
      </div>

      <Card style={{padding:24,marginBottom:16}}>

        {/* STEP 1 */}
        {step===1&&(
          <div>
            <h3 style={{margin:"0 0 14px",fontSize:16,fontWeight:600,color:C.text}}>Project Details</h3>

            {/* ── Quote Type ── */}
            <div style={{display:"flex",gap:8,marginBottom:18}}>
              {[
                {key:"residential",icon:"🏠",label:"Residential Design",  sub:"Stages 1–3 billable engagement"},
                {key:"specifier",  icon:"📐",label:"Specifier Quoting",   sub:"Stage 1 only · 100% courtesy discount · Unbillable"},
              ].map(t=>(
                <div key={t.key} onClick={()=>updP("quoteType",t.key)}
                  style={{flex:1,padding:"12px 14px",borderRadius:10,cursor:"pointer",transition:"all .15s",
                    border:`2px solid ${(proj.quoteType||"residential")===t.key?(t.key==="specifier"?"#8B5CF6":AMBER):C.border}`,
                    background:(proj.quoteType||"residential")===t.key?(t.key==="specifier"?"#8B5CF610":`${AMBER}08`):"transparent"}}>
                  <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>{t.label}</div>
                  <div style={{fontSize:11,color:C.text3,lineHeight:1.4}}>{t.sub}</div>
                </div>
              ))}
            </div>
            {isSpecifier&&(
              <div style={{padding:"10px 14px",borderRadius:8,background:"#F5F3FF",border:"1px solid #8B5CF640",marginBottom:14,fontSize:12,color:"#5B21B6",lineHeight:1.6}}>
                <strong>Specifier Quote:</strong> Stage 1 hours are calculated as normal and the full design fee is displayed.
                A 100% Professional Courtesy Discount is then applied — the specifier is invoiced ₦0.
                Unbillable hours and studio cost are tracked separately in the dashboard.
              </div>
            )}

            {isEdit&&(!proj.ownerName||!proj.ownerEmail)&&(
              <div style={{padding:"10px 14px",borderRadius:8,background:"#fef2f2",border:`1px solid #DC262640`,marginBottom:16,fontSize:13,color:"#991B1B",lineHeight:1.6}}>
                <strong>Action required:</strong> This quote is missing the Project Owner name and/or email.
                These are needed to send the quote to the client. Please fill them in below, then save.
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <IL label="Project Name"><TI value={proj.name} onChange={v=>updP("name",v)} placeholder="e.g. Aurora Villa, Eko Atlantic"/></IL>
              <IL label="Quote Reference"><TI value={proj.ref} onChange={v=>updP("ref",v)}/></IL>
              <IL label="Client Name"><TI value={proj.client} onChange={v=>updP("client",v)} placeholder="Client / company name"/></IL>
              <IL label="Quote Date"><TI value={proj.date} onChange={v=>updP("date",v)}/></IL>
            </div>
            <IL label="Client Address / Project Location"><TI value={proj.address} onChange={v=>updP("address",v)} placeholder="e.g. Banana Island, Lagos"/></IL>

            {/* ══ Specifier CRM picker (specifier quotes only) ══ */}
          {isSpecifier ? (
            <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border2}`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>
                Specifier Firm <span style={{color:C.red,fontSize:11}}>*</span>
              </div>
              <div style={{fontSize:12,color:C.text3,marginBottom:12,lineHeight:1.5}}>
                Select the firm requesting this budgetary schedule, or add a new one. Full details are mandatory — this contact will receive and accept the quote.
              </div>

              {/* Architect / MEP toggle */}
              <div style={{display:"flex",gap:6,marginBottom:12}}>
                {[["architect","🏛 Architect"],["mep","⚙️ MEP Consultant"]].map(([k,l])=>(
                  <button key={k} onClick={()=>{
                    updP("specifierType",k); updP("specifierId","")
                    updP("archCompany",""); updP("archContact",""); updP("archEmail",""); updP("archPhone","")
                    updP("mepCompany",""); updP("mepContact",""); updP("mepEmail",""); updP("mepPhone","")
                  }}
                    style={{padding:"7px 16px",borderRadius:8,border:`2px solid ${proj.specifierType===k?"#8B5CF6":C.border}`,
                      background:proj.specifierType===k?"#8B5CF610":"transparent",fontSize:13,cursor:"pointer",
                      fontWeight:proj.specifierType===k?600:400,color:proj.specifierType===k?"#7C3AED":C.text2}}>
                    {l}
                  </button>
                ))}
              </div>

              {proj.specifierType&&(
                <div>
                  {/* Selected firm */}
                  {proj.specifierId ? (()=>{
                    const selSpec = specifiers.find(s=>s.id===proj.specifierId)
                    const specStatus = selSpec?.status||"approved"
                    const isPending = specStatus==="pending"
                    const isRejected = specStatus==="rejected"
                    const borderCol = isPending?"#D97706":isRejected?"#DC2626":"#8B5CF6"
                    const bgCol = isPending?"#FFFBEB":isRejected?"#FEF2F2":"#8B5CF610"
                    return (
                    <div style={{marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:9,background:bgCol,border:"2px solid "+borderCol}}>
                        <span style={{fontSize:20}}>{proj.specifierType==="architect"?"🏛":"⚙️"}</span>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                            <span style={{fontSize:14,fontWeight:600,color:C.text}}>{proj.specifierType==="architect"?proj.archCompany:proj.mepCompany}</span>
                            {isPending&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,background:"#D9770620",color:"#D97706",border:"1px solid #D9770650"}}>⏳ Awaiting Approval</span>}
                            {isRejected&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,background:"#DC262620",color:"#DC2626",border:"1px solid #DC262650"}}>✗ Rejected</span>}
                            {!isPending&&!isRejected&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,background:"#16A34A20",color:"#16A34A",border:"1px solid #16A34A50"}}>✓ Approved</span>}
                          </div>
                          <div style={{fontSize:12,color:C.text2,marginTop:2}}>{proj.specifierType==="architect"?proj.archContact:proj.mepContact} · {proj.specifierType==="architect"?proj.archEmail:proj.mepEmail}</div>
                          {isRejected&&selSpec?.rejectionNotes&&<div style={{fontSize:11,color:"#DC2626",marginTop:3}}>Reason: {selSpec.rejectionNotes}</div>}
                        </div>
                        <Btn onClick={()=>{ updP("specifierId",""); setAddingSpec(false) }} variant="ghost" small>Change</Btn>
                      </div>
                      {isPending&&<div style={{padding:"8px 12px",borderRadius:"0 0 8px 8px",background:"#FFFBEB",border:"1px solid #D9770640",borderTop:"none",fontSize:12,color:"#92400E"}}>
                        This firm is awaiting Studio Lead approval. You cannot proceed until it is approved. Check back after the Lead reviews it in the Admin Panel.
                      </div>}
                      {isRejected&&<div style={{padding:"8px 12px",borderRadius:"0 0 8px 8px",background:"#FEF2F2",border:"1px solid #DC262640",borderTop:"none",fontSize:12,color:"#991B1B"}}>
                        This firm was rejected. Please select a different approved firm or submit a new one for approval.
                      </div>}
                    </div>
                    )
                  })()
                  : (
                    <div>
                      {!addingSpec&&(
                        <div>
                          <div style={{position:"relative",marginBottom:8}}>
                            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.text3,fontSize:14}}>🔍</span>
                            <input value={specSearch} onChange={e=>setSpecSearch(e.target.value)}
                              placeholder={`Search ${proj.specifierType==="architect"?"architect":"MEP"} firms in CRM...`}
                              style={{...inp({paddingLeft:32})}}/>
                          </div>
                          {(()=>{
                            const res = specifiers.filter(s=>s.type===proj.specifierType&&(s.status||"approved")==="approved"&&(!specSearch||s.company.toLowerCase().includes(specSearch.toLowerCase())||s.contact.toLowerCase().includes(specSearch.toLowerCase())))
                            if(res.length===0&&specSearch) return <div style={{fontSize:12,color:C.text3,marginBottom:8,padding:"4px 2px"}}>No match — add a new firm below</div>
                            return res.length>0 ? (
                              <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",marginBottom:10,maxHeight:180,overflowY:"auto"}}>
                                {res.map(s=>(
                                  <div key={s.id} onClick={()=>{
                                    updP("specifierId",s.id); updP("specifierType",s.type)
                                    if(s.type==="architect"){updP("archCompany",s.company);updP("archContact",s.contact);updP("archEmail",s.email);updP("archPhone",s.phone||"")}
                                    else{updP("mepCompany",s.company);updP("mepContact",s.contact);updP("mepEmail",s.email);updP("mepPhone",s.phone||"")}
                                    setSpecSearch("")
                                  }} style={{padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border2}`}}
                                  onMouseOver={e=>e.currentTarget.style.background=C.bg2}
                                  onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{s.company}</div>
                                    <div style={{fontSize:11,color:C.text3,marginTop:1}}>{s.contact} · {s.email}{s.quoteCount?` · ${s.quoteCount} quote${s.quoteCount!==1?"s":""}`:""}</div>
                                  </div>
                                ))}
                              </div>
                            ) : null
                          })()}
                          <Btn onClick={()=>setAddingSpec(true)} variant="ghost" small>+ Add New Firm</Btn>
                        </div>
                      )}

                      {addingSpec&&(
                        <div style={{padding:14,borderRadius:9,border:"1px solid #8B5CF6",background:"#8B5CF608"}}>
                          <div style={{fontSize:13,fontWeight:600,color:"#5B21B6",marginBottom:10}}>
                            New {proj.specifierType==="architect"?"Architect":"MEP Consultant"} Firm
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                            <IL label="Company Name *" style={{marginBottom:0}}><TI value={newSpec.company} onChange={v=>setNewSpec(n=>({...n,company:v}))} placeholder="Firm name"/></IL>
                            <IL label="Contact Person *" style={{marginBottom:0}}><TI value={newSpec.contact} onChange={v=>setNewSpec(n=>({...n,contact:v}))} placeholder="Full name"/></IL>
                            <IL label="Email *" style={{marginBottom:0}}><TI value={newSpec.email} onChange={v=>setNewSpec(n=>({...n,email:v}))} placeholder="contact@firm.com" type="email"/></IL>
                            <IL label="Phone" style={{marginBottom:0}}><TI value={newSpec.phone} onChange={v=>setNewSpec(n=>({...n,phone:v}))} placeholder="+234 801 234 5678"/></IL>
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <Btn onClick={async()=>{
                              if(!newSpec.company||!newSpec.contact||!newSpec.email) return
                              const entry={
                                id:uid(),type:proj.specifierType,
                                company:newSpec.company,contact:newSpec.contact,
                                email:newSpec.email,phone:newSpec.phone,
                                createdAt:Date.now(),quoteCount:0,
                                status:"pending",
                                submittedBy:session.name,submittedAt:Date.now(),
                                rejectionNotes:""
                              }
                              const updated=[...specifiers,entry]
                              await store.saveSpecifiers(updated)
                              setSpecifiers(updated)
                              // Store entry id so designer knows they submitted this one
                              setPendingSubmitted(entry.id)
                              setNewSpec({type:proj.specifierType,company:"",contact:"",email:"",phone:""})
                              setAddingSpec(false)
                              // Email notification to Lead
                              const leadEmail = settings.leadEmail||"tonyemelukwe@ced.africa"
                              const subject = encodeURIComponent("Specifier Approval Required -- "+entry.company+" -- "+entry.type.charAt(0).toUpperCase()+entry.type.slice(1))
                              const bodyText = [
                                "Dear Studio Lead,",
                                "",
                                session.name+" has submitted a new specifier firm for approval.",
                                "",
                                "SPECIFIER DETAILS",
                                "Firm:    "+entry.company,
                                "Type:    "+(entry.type==="architect"?"Architect":"MEP Consultant"),
                                "Contact: "+entry.contact,
                                "Email:   "+entry.email,
                                entry.phone?"Phone:   "+entry.phone:"",
                                "",
                                "Please review and approve or reject this specifier in the Admin Panel > Specifiers CRM.",
                                "",
                                "CED Africa AV Design Studio",
                              ].filter(l=>l!==null).join("\r\n")

                              const a=document.createElement("a")
                              a.href="mailto:"+leadEmail+"?subject="+subject+"&body="+encodeURIComponent(bodyText)
                              document.body.appendChild(a); a.click(); document.body.removeChild(a)
                            }} disabled={!newSpec.company||!newSpec.contact||!newSpec.email} small>Submit for Approval</Btn>
                            <Btn onClick={()=>setAddingSpec(false)} variant="ghost" small>Cancel</Btn>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
            {/* Project Owner — residential */}
            <div style={{marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border2}`}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>Project Owner <span style={{color:C.red,fontSize:11}}>*</span></div>
              <div style={{fontSize:12,color:C.text3,marginBottom:10}}>The person commissioning this project. Name and email are required.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <IL label="Full Name *" hint={isEdit&&!proj.ownerName?"Required — add owner name.":undefined}>
                  <TI value={proj.ownerName||""} onChange={v=>updP("ownerName",v)} placeholder="e.g. Emeka Okafor"
                    style={{borderColor:isEdit&&!proj.ownerName?"#DC2626":undefined}}/>
                </IL>
                <IL label="Email Address *" hint={isEdit&&!proj.ownerEmail?"Required to send the quote.":undefined}>
                  <TI value={proj.ownerEmail||""} onChange={v=>updP("ownerEmail",v)} placeholder="owner@email.com" type="email"
                    style={{borderColor:isEdit&&!proj.ownerEmail?"#DC2626":undefined}}/>
                </IL>
                <IL label="Phone Number"><TI value={proj.ownerPhone||""} onChange={v=>updP("ownerPhone",v)} placeholder="+234 801 234 5678"/></IL>
              </div>
            </div>
            {/* Architect — residential optional */}
            <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border2}`}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>Project Architect <span style={{color:C.text3,fontSize:11,fontWeight:400}}>(optional)</span></div>
              <div style={{fontSize:12,color:C.text3,marginBottom:10}}>Architectural firm. Company name required if added.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <IL label="Company Name"><TI value={proj.archCompany||""} onChange={v=>updP("archCompany",v)} placeholder="e.g. Architeam Associates"/></IL>
                <IL label="Contact Name"><TI value={proj.archContact||""} onChange={v=>updP("archContact",v)} placeholder="Lead architect"/></IL>
                <IL label="Email"><TI value={proj.archEmail||""} onChange={v=>updP("archEmail",v)} placeholder="architect@firm.com" type="email"/></IL>
                <IL label="Phone"><TI value={proj.archPhone||""} onChange={v=>updP("archPhone",v)} placeholder="+234 801 234 5678"/></IL>
              </div>
            </div>
            {/* MEP — residential optional */}
            <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border2}`}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:2}}>MEP Consultant <span style={{color:C.text3,fontSize:11,fontWeight:400}}>(optional)</span></div>
              <div style={{fontSize:12,color:C.text3,marginBottom:10}}>M&E engineering consultant. Company name required if added.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <IL label="Company Name"><TI value={proj.mepCompany||""} onChange={v=>updP("mepCompany",v)} placeholder="e.g. MEP Engineers Ltd"/></IL>
                <IL label="Contact Name"><TI value={proj.mepContact||""} onChange={v=>updP("mepContact",v)} placeholder="Lead consultant"/></IL>
                <IL label="Email"><TI value={proj.mepEmail||""} onChange={v=>updP("mepEmail",v)} placeholder="mep@firm.com" type="email"/></IL>
                <IL label="Phone"><TI value={proj.mepPhone||""} onChange={v=>updP("mepPhone",v)} placeholder="+234 801 234 5678"/></IL>
              </div>
            </div>
            </>
          )}
          </div>
        )}

        {/* STEP 2 */}
        {step===2&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <h3 style={{margin:0,fontSize:16,fontWeight:600,color:C.text}}>Location Registry</h3>
                <p style={{margin:"3px 0 0",fontSize:13,color:C.text2}}>Enter every room from the floor plan. Size tier drives the hour multiplier.</p>
              </div>
              <Btn onClick={addRoom} small>+ Add Room</Btn>
            </div>
            <Card style={{overflow:"hidden",marginBottom:12}}>
              <div style={{maxHeight:440,overflowY:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
                  <colgroup><col style={{width:"26%"}}/><col style={{width:"31%"}}/><col style={{width:"19%"}}/><col style={{width:"14%"}}/><col style={{width:"10%"}}/></colgroup>
                  <thead>
                    <tr>
                      {["Room Name","Location Type","Area (m²)","3D Render",""].map((h,i)=>(
                        <th key={i} style={{position:"sticky",top:0,zIndex:10,padding:"10px 12px",fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:".05em",textAlign:"left",background:C.bg2,borderBottom:`2px solid ${C.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r,ri)=>(
                      <tr key={r.id} style={{background:ri%2===0?C.bg:C.bg2,verticalAlign:"top"}}>
                        <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border2}`}}>
                          <input value={r.name} onChange={e=>updRoom(r.id,"name",e.target.value)} placeholder={r.locType||"Room name"} style={inp({padding:"7px 10px"})}/>
                        </td>
                        <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border2}`}}>
                          <Sel value={r.locType} onChange={v=>updRoom(r.id,"locType",v)} placeholder="Select type..." options={LOC_TYPES}/>
                        </td>
                        <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border2}`}}>
                          <input type="number" value={r.sqm} onChange={e=>updRoom(r.id,"sqm",e.target.value)} placeholder="e.g. 35" style={inp({padding:"7px 10px"})}/>
                          {r.sqm&&(()=>{
                            const isCin = r.locType==="Home Cinema"
                            const usedTiers = isCin ? getCinemaTiers(tiers) : tiers
                            const tier = getSizeTier(r.sqm,usedTiers)
                            const mult = getSizeMult(r.sqm,usedTiers)
                            const renderH = isCin ? (CINEMA_RENDER_HRS[tier]||4) : 0
                            return <div style={{fontSize:10,color:isCin?"#7C3AED":AMBER,marginTop:2,fontWeight:600}}>
                              {isCin?"HC-":""}{tier} · {mult}×{isCin&&r.cinRender?<span style={{fontSize:9,color:"#7C3AED",marginLeft:3}}>+{renderH}h render ✓</span>:isCin?<span style={{fontSize:9,color:"#9CA3AF",marginLeft:3}}>no render</span>:""}
                            </div>
                          })()}
                        </td>
                        <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border2}`,textAlign:"center",verticalAlign:"middle"}}>
                          {r.locType==="Home Cinema"?(
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                                <input type="checkbox" checked={!!r.cinRender}
                                  onChange={e=>updRoom(r.id,"cinRender",e.target.checked)}
                                  style={{width:15,height:15,accentColor:"#7C3AED",cursor:"pointer"}}/>
                                <span style={{fontSize:11,color:r.cinRender?"#7C3AED":C.text3,fontWeight:r.cinRender?600:400}}>
                                  {r.cinRender?"Included":"Optional"}
                                </span>
                              </label>
                              {r.cinRender&&r.sqm&&(()=>{
                                const t=getSizeTier(r.sqm,getCinemaTiers(tiers))
                                return <span style={{fontSize:9,color:"#9CA3AF"}}>+{CINEMA_RENDER_HRS[t]||4}h</span>
                              })()}
                            </div>
                          ):<span style={{color:C.border,fontSize:11}}>—</span>}
                        </td>
                        <td style={{padding:"8px 12px",borderBottom:`1px solid ${C.border2}`,textAlign:"center",paddingTop:10}}>
                          <button onClick={()=>remRoom(r.id)} disabled={rooms.length===1} style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.text3,fontSize:15,cursor:"pointer",opacity:rooms.length===1?.3:1}}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
              {tiers.map(t=><span key={t.id} style={{fontSize:11,padding:"3px 9px",borderRadius:5,background:`${AMBER}12`,border:`1px solid ${AMBER}40`,color:C.text2}}><strong style={{color:AMBER}}>{t.id}</strong> {t.hint} = {t.mult}×</span>)}
            </div>
            {validRooms.length>0&&(
              <div style={{padding:"10px 14px",borderRadius:8,background:C.bg3,border:`1px solid ${C.border}`,display:"flex",flexWrap:"wrap",gap:5}}>
                {presentTypes.map(lt=>{
                  const av=byType.avg[lt];const tier=av?getSizeTier(av,tiers):null
                  return <span key={lt} style={{fontSize:12,padding:"3px 9px",borderRadius:5,background:`${AMBER}15`,border:`1px solid ${AMBER}40`,color:C.text}}>{lt} ×{byType.count[lt]}{tier&&<span style={{color:AMBER,marginLeft:3,fontSize:9}}>{tier}</span>}</span>
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step===3&&(
          <div>
            <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:600,color:C.text}}>Scope & Configuration</h3>
            <p style={{margin:"0 0 16px",fontSize:13,color:C.text2}}>CED defaults pre-filled. Click any cell to override for this project.</p>
            {/* Mapping grid */}
            {presentTypes.length>0&&(
              <div style={{overflowX:"auto",overflowY:"auto",maxHeight:460,marginBottom:18,borderRadius:9,border:`1px solid ${C.border}`}}>
                <table style={{borderCollapse:"collapse",minWidth:700}}>
                  <thead>
                    <tr style={{background:C.bg2}}>
                      <th style={{padding:"8px 12px",fontSize:12,fontWeight:600,color:C.text2,textAlign:"left",borderBottom:`2px solid ${C.border}`,minWidth:178,position:"sticky",top:0,left:0,background:C.bg2,zIndex:5}}>Location Type</th>
                      <th style={{padding:"8px",fontSize:11,color:C.text3,borderBottom:`2px solid ${C.border}`,textAlign:"center",minWidth:30,position:"sticky",top:0,background:C.bg2,zIndex:3}}>Qty</th>
                      {SYSTEMS.map(s=>(
                        <th key={s.id} style={{padding:"3px 3px 8px",fontSize:9,color:C.text3,borderBottom:`2px solid ${C.border}`,textAlign:"center",minWidth:38,writingMode:"vertical-lr",transform:"rotate(180deg)",whiteSpace:"nowrap",height:66,position:"sticky",top:0,background:C.bg2,zIndex:3}}>{s.short}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {presentTypes.map((lt,ri)=>(
                      <tr key={lt} style={{background:ri%2===0?"transparent":C.bg2}}>
                        <td style={{padding:"7px 12px",fontSize:13,fontWeight:500,color:C.text,borderBottom:`1px solid ${C.border2}`,position:"sticky",left:0,zIndex:1,background:ri%2===0?C.bg2:C.bg}}>{lt}</td>
                        <td style={{padding:"7px 8px",textAlign:"center",fontSize:13,fontWeight:600,color:C.text,borderBottom:`1px solid ${C.border2}`}}>{byType.count[lt]}</td>
                        {SYSTEMS.map((_,idx)=>{
                          const on=getMap(lt,idx),changed=mapOv[lt]?.[idx]!==undefined
                          const def=!!(MAP[lt]?.[idx]),isAdd=changed&&on&&!def,isRem=changed&&!on&&def
                          let bg="transparent",bdr=`1px solid ${C.border2}`,col=C.text3
                          if(on&&!changed){bg=`${AMBER}15`;bdr=`1px solid ${AMBER}`;col=AMBER}
                          if(isAdd){bg="#9333EA18";bdr="1px solid #9333EA";col="#9333EA"}
                          if(isRem){bg="#EF444415";bdr="1px solid #EF4444";col="#EF4444"}
                          return(
                            <td key={idx} style={{padding:3,textAlign:"center",borderBottom:`1px solid ${C.border2}`}}>
                              <button onClick={()=>togMap(lt,idx)} style={{width:28,height:25,borderRadius:5,cursor:"pointer",border:bdr,background:bg,fontSize:11,color:col,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
                                {on?(isAdd?"+":"✓"):(isRem?"✗":"")}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <IL label="Discount %">
                  {isSpecifier
                    ?<div style={{padding:"9px 12px",borderRadius:8,background:"#8B5CF615",border:"1px solid #8B5CF640",fontSize:13,fontWeight:600,color:"#7C3AED"}}>100% — Professional Courtesy</div>
                    :<NI value={cfg.discount} onChange={v=>updC("discount",Math.min(50,v))} min={0} max={50}/>
                  }
                </IL>
              <IL label="Scope Notes"><input value={cfg.notes} onChange={e=>updC("notes",e.target.value)} placeholder="Notes or scope exclusions..." style={inp()}/></IL>
            </div>
            {/* Stage 4 — hidden for specifier */}
            {!isSpecifier&&<div style={{padding:14,borderRadius:10,border:`2px solid ${cfg.s4Included?AMBER:C.border}`,background:cfg.s4Included?`${AMBER}06`:"transparent",marginBottom:12}}>
              <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                <input type="checkbox" checked={cfg.s4Included} onChange={e=>updC("s4Included",e.target.checked)} style={{marginTop:2,accentColor:AMBER,width:16,height:16,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:2}}>Stage 4 — Project Delivery Governance (Optional Monthly Retainer)</div>
                  <div style={{fontSize:12,color:C.text2,lineHeight:1.6}}>Bi-weekly site meetings · QC gates: First-Fix, Second-Fix &amp; Finish Install · Final commissioning verification. Prepaid monthly from execution kick-off.</div>
                </div>
              </label>
              {cfg.s4Included&&(
                <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${AMBER}30`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <IL label="Estimated months on site"><NI value={cfg.s4Months} onChange={v=>updC("s4Months",v)} min={1} max={36}/></IL>
                  <IL label="Total AV system value (₦)" hint="For 0.1% calculation"><input type="number" value={cfg.avSystemValue} onChange={e=>updC("avSystemValue",parseFloat(e.target.value)||0)} style={inp()}/></IL>
                  <IL label="Monthly retainer fee">
                    <div style={{padding:"9px 12px",borderRadius:7,border:`1px solid ${AMBER}`,background:`${AMBER}10`,fontSize:14,fontWeight:600,color:AMBER}}>{ngn(calc.s4Monthly)}/mo</div>
                  </IL>
                </div>
              )}
            </div>}
            {/* Live totals */}
            <div style={{padding:14,borderRadius:8,background:`${AMBER}10`,border:`1px solid ${AMBER}50`,display:"flex",gap:20,flexWrap:"wrap",justifyContent:"space-around"}}>
              {(isSpecifier
                ? [["S1 (Unbillable)",hrs(calc.stageHrs.s1||0)],["S2 (Indicative)",hrs(calc.stageHrs.s2||0)],["S3 (Indicative)",hrs(calc.stageHrs.s3||0)],["Amount Invoiced","₦0"]]
                : [["S1",hrs(calc.stageHrs.s1||0)],["S2",hrs(calc.stageHrs.s2||0)],["S3",hrs(calc.stageHrs.s3||0)],["Total Hours",hrs(calc.totalH)],["Grand Total",ngn(calc.grand)]])
              .map(([l,v])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:600,color:AMBER}}>{v}</div>
                  <div style={{fontSize:11,color:C.text3}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Preview */}
        {step===4&&(
          <div>
            <div style={{padding:"14px 18px",background:C.bg2,borderRadius:10,border:`1px solid ${C.border}`,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:11,color:AMBER,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>CED Africa — AV Consulting Design Services</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.text}}>Residential Home Technology System</div>
                  <div style={{fontSize:12,color:C.text2,marginTop:2}}>{validRooms.length} Rooms · {presentTypes.length} Location Types · {Object.values(calc.detail).filter(d=>d.h>0).length} Sub-Systems</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:20,fontWeight:700,color:C.text}}>QUOTATION</div>
                  <div style={{fontSize:12,color:C.text3}}>{proj.ref}</div>
                  <div style={{fontSize:12,color:C.text3}}>{proj.date}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border2}`}}>
                <div><div style={{fontSize:11,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>Prepared For</div><div style={{fontSize:14,fontWeight:600,color:C.text}}>{proj.client||"—"}</div>{proj.address&&<div style={{fontSize:12,color:C.text2,marginTop:2}}>{proj.address}</div>}</div>
                <div><div style={{fontSize:11,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>Project</div><div style={{fontSize:14,fontWeight:600,color:C.text}}>{proj.name||"—"}</div></div>
              </div>
            </div>

            {/* ── Stage breakdown: specifier vs residential ── */}
            <SectionTitle>Design Stage Breakdown</SectionTitle>
            <Card style={{marginBottom:16}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:C.bg2}}>
                    {["Stage / Deliverables","Hours","Rate / hr","Stage Fee"].map((h,i)=>(
                      <th key={h} style={{padding:"9px 12px",fontSize:12,fontWeight:600,color:C.text2,textAlign:i===0?"left":i===3?"right":"center",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calc.stageList.map(st=>{
                    const isComplimentary = isSpecifier && st.id==="s1"
                    const isPaidUpsell    = isSpecifier && st.id!=="s1"
                    return (
                      <tr key={st.id} style={{borderTop:`1px solid ${C.border2}`,
                        background:isPaidUpsell?"#f8f7f5":isComplimentary?"#8B5CF608":"transparent"}}>
                        <td style={{padding:"11px 12px"}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:isPaidUpsell?"#d0cfc9":st.color,flexShrink:0,marginTop:3}}/>
                            <div>
                              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                                <span style={{fontSize:13,fontWeight:600,color:isPaidUpsell?C.text3:C.text}}>
                                  Stage {st.num} — {st.name}
                                </span>
                                {isComplimentary&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:"#8B5CF622",color:"#7C3AED",border:"1px solid #8B5CF650"}}>✓ Complimentary</span>}
                                {isPaidUpsell&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:`${C.border}`,color:C.text3,border:`1px solid ${C.border}`}}>Available — Paid Engagement</span>}
                                {!isSpecifier&&st.gate&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:st.color+"22",color:st.color,border:`1px solid ${st.color}50`}}>🏁 {st.gate}</span>}
                              </div>
                              <div style={{fontSize:11,color:C.text3,marginBottom:isPaidUpsell?0:5}}>{st.sub}</div>
                              {!isPaidUpsell&&(PLAIN[st.id]||[]).map((d,i)=>(
                                <div key={i} style={{marginBottom:6}}>
                                  <div style={{fontSize:12,fontWeight:500,color:C.text}}>• {d.title}</div>
                                  <div style={{fontSize:11,color:C.text2,lineHeight:1.5,marginLeft:10,marginTop:1}}>{d.plain}</div>
                                </div>
                              ))}
                              {st.id==="s1"&&rooms.some(r=>r.locType==="Home Cinema"&&r.cinRender)&&(
                                <div style={{marginBottom:6,padding:"6px 10px",borderRadius:6,background:"#8B5CF610",border:"1px solid #8B5CF640"}}>
                                  <div style={{fontSize:12,fontWeight:600,color:"#7C3AED"}}>• {PLAIN_CINEMA_RENDER.title}</div>
                                  <div style={{fontSize:11,color:C.text2,lineHeight:1.5,marginLeft:10,marginTop:1}}>{PLAIN_CINEMA_RENDER.plain}</div>
                                </div>
                              )}
                            
                            </div>
                          </div>
                        </td>
                        <td style={{padding:"11px 12px",textAlign:"center",fontSize:13,fontWeight:600,
                          color:isPaidUpsell?C.text3:C.text,verticalAlign:"top"}}>{hrs(st.hours)}</td>
                        <td style={{padding:"11px 12px",textAlign:"center",fontSize:12,
                          color:isPaidUpsell?C.text3:C.text2,verticalAlign:"top"}}>{ngn(calc.RATE)}</td>
                        <td style={{padding:"11px 12px",textAlign:"right",verticalAlign:"top"}}>
                          {isComplimentary?(
                            <div>
                              <div style={{fontSize:12,color:C.text3,textDecoration:"line-through"}}>{ngn(st.fee)}</div>
                              <div style={{fontSize:13,fontWeight:700,color:"#7C3AED"}}>₦0 Complimentary</div>
                            </div>
                          ):(
                            <span style={{fontSize:13,fontWeight:600,color:isPaidUpsell?C.text3:C.text}}>{ngn(st.fee)}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {/* Stage 4 row */}
                  {(isSpecifier||cfg.s4Included)&&(
                    <>
                      <tr>
                        <td colSpan={4} style={{padding:0}}>
                          <div style={{padding:"4px 12px",background:isSpecifier?`${C.border}`:`${AMBER}15`,borderTop:`2px dashed ${isSpecifier?C.border2:AMBER}`,fontSize:11,fontWeight:700,color:isSpecifier?C.text3:AMBER,letterSpacing:".05em"}}>
                            {isSpecifier?"STAGE 4 — AVAILABLE AS PAID ENGAGEMENT":"OPTIONAL — STAGE 4 NOT INCLUDED IN TOTAL"}
                          </div>
                        </td>
                      </tr>
                      <tr style={{background:isSpecifier?"#f8f7f5":`${AMBER}06`}}>
                        <td style={{padding:"11px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                            <span style={{fontSize:13,fontWeight:600,color:isSpecifier?C.text3:C.text}}>Stage 04 — {S4_META.name}</span>
                            {isSpecifier
                              ?<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:C.border,color:C.text3,border:`1px solid ${C.border}`}}>Available — Paid Engagement</span>
                              :<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:`${AMBER}22`,color:AMBER,border:`1px solid ${AMBER}50`}}>OPTIONAL RETAINER</span>
                            }
                          </div>
                          <div style={{fontSize:11,color:C.text3,marginBottom:isSpecifier?0:5}}>{S4_META.sub}</div>
                          {!isSpecifier&&PLAIN_S4.map((d,i)=>(<div key={i} style={{marginBottom:5}}><div style={{fontSize:12,fontWeight:500,color:C.text}}>• {d.title}</div><div style={{fontSize:11,color:C.text2,lineHeight:1.5,marginLeft:10}}>{d.plain}</div></div>))}
                        </td>
                        <td style={{padding:"11px 12px",textAlign:"center",fontSize:12,color:isSpecifier?C.text3:C.text2,verticalAlign:"top"}}>{isSpecifier?"—":cfg.s4Months+" mo"}</td>
                        <td style={{padding:"11px 12px",textAlign:"center",fontSize:12,color:isSpecifier?C.text3:C.text2,verticalAlign:"top"}}>{ngn(calc.s4Monthly)}/mo</td>
                        <td style={{padding:"11px 12px",textAlign:"right",verticalAlign:"top",fontSize:13,fontWeight:600,color:isSpecifier?C.text3:AMBER}}>
                          {isSpecifier?ngn(calc.s4Monthly)+"/mo":ngn(cfg.s4Included?calc.s4Total:calc.s4Monthly)+"/mo"}
                          {!isSpecifier&&<div style={{fontSize:10,color:C.text3,fontWeight:400,marginTop:2}}>not in total</div>}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Totals row */}
                  {isSpecifier?(
                    <>
                      <tr style={{borderTop:`2px solid ${"#8B5CF6"}`,background:"#8B5CF608"}}>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{fontSize:13,fontWeight:700,color:"#5B21B6"}}>Stage 1 — Complimentary (Amount Invoiced)</div>
                          <div style={{fontSize:11,color:"#7C3AED",marginTop:1}}>Stage 1 hours tracked as unbillable studio cost internally</div>
                        </td>
                        <td style={{padding:"10px 12px",textAlign:"center",fontSize:13,fontWeight:700,color:"#5B21B6"}}>{hrs(calc.stageHrs.s1||0)}</td>
                        <td/>
                        <td style={{padding:"10px 12px",textAlign:"right",fontSize:15,fontWeight:700,color:"#7C3AED"}}>₦0</td>
                      </tr>
                      <tr style={{background:"#f8f7f5"}}>
                        <td style={{padding:"8px 12px",fontSize:12,color:C.text3}} colSpan={3}>Stages 2, 3 &amp; 4 indicative fees — available as paid engagement if required</td>
                        <td style={{padding:"8px 12px",textAlign:"right",fontSize:12,color:C.text3}}>
                          {ngn((calc.stageList.find(s=>s.id==="s2")?.fee||0)+(calc.stageList.find(s=>s.id==="s3")?.fee||0))} + {ngn(calc.s4Monthly)}/mo
                        </td>
                      </tr>
                    </>
                  ):(
                    <tr style={{borderTop:`2px solid ${C.border}`,background:C.bg2}}>
                      <td style={{padding:"10px 12px",fontSize:14,fontWeight:700,color:C.text}}>Stages 1–3 Total</td>
                      <td style={{padding:"10px 12px",textAlign:"center",fontSize:14,fontWeight:700,color:C.text}}>{hrs(calc.totalH)}</td>
                      <td/>
                      <td style={{padding:"10px 12px",textAlign:"right",fontSize:14,fontWeight:700,color:C.text}}>{ngn(calc.subtotal)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            {/* Fee summary */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <Card><div style={{padding:16}}>
                <SectionTitle>{isSpecifier?"Specifier Fee Summary":"Fee Summary"}</SectionTitle>
                {isSpecifier?(
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}>
                      <span style={{fontSize:13,color:C.text2}}>Stage 1 Design Fee</span>
                      <span style={{fontSize:13,color:C.text3,textDecoration:"line-through"}}>{ngn(calc.stageHrs.s1*calc.RATE||0)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}>
                      <span style={{fontSize:13,color:C.text2}}>Professional Courtesy Discount</span>
                      <span style={{fontSize:13,color:"#7C3AED",fontWeight:500}}>100%</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:`1px solid ${"#8B5CF6"}`,marginTop:5}}>
                      <span style={{fontSize:14,fontWeight:700,color:"#5B21B6"}}>Amount Invoiced (Stage 1)</span>
                      <span style={{fontSize:16,fontWeight:700,color:"#7C3AED"}}>₦0</span>
                    </div>
                    <div style={{marginTop:10,padding:"8px 10px",borderRadius:7,background:"#8B5CF608",border:"1px dashed #8B5CF640"}}>
                      <div style={{fontSize:11,fontWeight:600,color:"#7C3AED",marginBottom:4}}>Studio Internal Cost (Unbillable)</div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:12,color:C.text3}}>Stage 1 hours × rate</span>
                        <span style={{fontSize:12,fontWeight:600,color:"#7C3AED"}}>{ngn(calc.stageHrs.s1*calc.RATE||0)}</span>
                      </div>
                    </div>
                  </div>
                ):(
                  <>
                  {[
                    ["Design Fee (excl. VAT)",ngn(calc.subtotal),false],
                    ...(cfg.discount>0?[["Discount ("+cfg.discount+"%)", "– "+ngn(calc.discAmt),false],["After Discount",ngn(calc.afterDisc),false]]:[]),
                    ["VAT (7.5%)",ngn(calc.vatAmt),false],
                    ["Stages 1–3 Grand Total",ngn(calc.grand),true],
                  ].map(([l,v,bold])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:bold?`1px solid ${C.border}`:"none",marginTop:bold?5:0}}>
                      <span style={{fontSize:13,color:C.text2}}>{l}</span>
                      <span style={{fontSize:bold?15:13,fontWeight:bold?700:500,color:bold?AMBER:C.text}}>{v}</span>
                    </div>
                  ))}
                  </>
                )}
              </div></Card>
              <Card><div style={{padding:16}}>
                <SectionTitle>{isSpecifier?"Paid Engagement Indicative Fees":"Payment Schedule"}</SectionTitle>
                {isSpecifier?(
                  <div>
                    <div style={{fontSize:12,color:C.text3,marginBottom:10,lineHeight:1.5}}>
                      Should the specifier wish to proceed with full CED Africa AV Consulting Design Services for their end-client, the following fees apply:
                    </div>
                    {[
                      ["Stage 2 — Site Pack",ngn(calc.stageList.find(s=>s.id==="s2")?.fee||0)],
                      ["Stage 3 — Engineering Pack",ngn(calc.stageList.find(s=>s.id==="s3")?.fee||0)],
                      ["Stage 4 — Delivery Governance",ngn(calc.s4Monthly)+"/mo"],
                    ].map(([l,v])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border2}`}}>
                        <span style={{fontSize:12,color:C.text2}}>{l}</span>
                        <span style={{fontSize:13,fontWeight:600,color:C.text}}>{v}</span>
                      </div>
                    ))}
                    <div style={{fontSize:11,color:C.text3,marginTop:8,lineHeight:1.5}}>All fees excl. VAT at 7.5%. Stages 2 &amp; 3 payable 50% advance, 50% on delivery. Stage 4 prepaid monthly from onsite kick-off.</div>
                  </div>
                ):(
                  <>
                  <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.text2}}>50% Advance</span><span style={{fontSize:14,fontWeight:600,color:C.text}}>{ngn(calc.grand*0.5)}</span></div><div style={{fontSize:11,color:C.text3,marginTop:2}}>Due to commence design work</div></div>
                  <div><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.text2}}>50% Balance</span><span style={{fontSize:14,fontWeight:600,color:C.text}}>{ngn(calc.grand*0.5)}</span></div><div style={{fontSize:11,color:C.text3,marginTop:2}}>Due on delivery of documentation</div></div>
                  {cfg.s4Included&&(
                    <div style={{marginTop:10,padding:"10px 12px",borderRadius:7,background:`${AMBER}10`,border:`1px dashed ${AMBER}`}}>
                      <div style={{fontSize:11,fontWeight:700,color:AMBER,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Optional — Not included above</div>
                      <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.text2}}>Stage 4 Monthly Retainer</span><span style={{fontSize:14,fontWeight:600,color:AMBER}}>{ngn(calc.s4Monthly)}/mo</span></div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}><span style={{fontSize:12,color:C.text3}}>Est. {cfg.s4Months} months total</span><span style={{fontSize:12,color:C.text3}}>{ngn(calc.s4Total)}</span></div>
                      <div style={{fontSize:11,color:C.text3,marginTop:4,lineHeight:1.5}}>Stage 4 is invoiced monthly from project execution kick-off.</div>
                    </div>
                  )}
                  </>
                )}
              </div></Card>
            </div>

            {isEdit&&editQuote.status==="rejected"&&(
              <div style={{padding:14,borderRadius:8,background:"#fef2f2",border:`1px solid ${C.red}30`,marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:C.red,marginBottom:4}}>Quote returned with notes from Studio Lead</div>
                <div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>{editQuote.rejectionNotes||"No specific notes provided."}</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Btn onClick={()=>setStep(s=>Math.max(1,s-1))} disabled={step===1} variant="ghost">← Back</Btn>
        <div style={{fontSize:12,color:C.text3}}>Step {step} of 4</div>
        {step<4
          ?<Btn onClick={()=>canNext()&&setStep(s=>s+1)} disabled={!canNext()}>Continue →</Btn>
          :<div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>saveQuote("draft")} variant="ghost">Save Draft</Btn>
            <Btn onClick={()=>saveQuote("pending_approval")} variant="success">Submit for Approval</Btn>
          </div>
        }
      </div>
    </div>
  )
}

// ── Quote Detail / Workflow ────────────────────────────────
function QuoteDetail({quote:initial, session, settings, onBack, onEdit, onUpdate, onConvert}) {
  const [quote,setQuote]=useState(initial)
  const isSpecifier = quote.quoteType==="specifier"
  const [rejNotes,setRejNotes]=useState("")
  const [showRej,setShowRej]=useState(false)
  const [saving,setSaving]=useState(false)
  const [showEmailModal,setShowEmailModal]=useState(false)
  const [currency,setCurrency]=useState("NGN")
  const [printNotice,setPrintNotice]=useState(false)

  const portalToken = quote.clientToken||""
  const portalURL = portalToken ? (window.location.href.split("#")[0]+"#portal/"+portalToken) : ""
  const effectiveSettings = useMemo(()=>({...settings,rate:quote.rateOverride||settings.rate||80000}),[settings,quote.rateOverride])
  const effectiveCfg=useMemo(()=>isSpecifier?{...(quote.cfg||{}),discount:100,s4Included:false}:(quote.cfg||{}),[quote.cfg,isSpecifier])
  const calc = useMemo(()=>calcQuote(quote.rooms||[],quote.mapOv||{},effectiveCfg,effectiveSettings),[quote,effectiveCfg,effectiveSettings])
  const usdRate = settings.usdRate||1600
  const fmt = n => currency==="USD" ? "$"+Math.round(n/usdRate).toLocaleString("en-US") : "₦"+Math.round(n).toLocaleString("en-NG")
  const rateLabel = currency==="USD" ? `$${Math.round((effectiveSettings.rate||80000)/usdRate)}/hr` : `₦${(effectiveSettings.rate||80000).toLocaleString("en-NG")}/hr`

  const action = async (newStatus, notes="") => {
    setSaving(true)
    const now = Date.now()
    const quotes = await store.getQuotes()
    const histEntry = {timestamp:now,action:newStatus,by:session.userId,byName:session.name,notes}
    const updated = {
      ...quote, status:newStatus, history:[...(quote.history||[]),histEntry],
      ...(newStatus==="approved"?{approvedAt:now, clientToken:quote.clientToken||uid()}:{}),
      ...(newStatus==="rejected"?{rejectionNotes:notes}:{}),
      ...(newStatus==="sent"?{sentAt:now}:{}),
      ...(newStatus==="accepted"||newStatus==="declined"?{clientResponseAt:now}:{}),
      ...(newStatus==="accepted"&&!quote.clientSignedBy?{
        clientSignedBy:quote.proj?.ownerName||quote.proj?.client||"—",
        clientSignedAt:now
      }:{}),
    }
    await store.saveQuotes(quotes.map(q=>q.id===quote.id?updated:q))
    setQuote(updated)
    onUpdate(updated)
    setSaving(false)
    setShowRej(false)
  }

  // ── File naming: [ref]_[Client|Internal]_[ProjectName]_v[ver]_[YYYYMMDD].html
  const buildFilename = (type) => {
    const ref   = (quote.ref||"CED-REF").replace(/[\/]/g,"-")
    const name  = (quote.projectName||"Project").replace(/\s+/g,"-").replace(/[^a-zA-Z0-9-]/g,"")
    const ver   = `v${quote.version||1}`
    const today = new Date().toISOString().slice(0,10).replace(/-/g,"")
    return `${ref}_${type}_${name}_${ver}_${today}.html`
  }
  const triggerDL = (html, filename) => {
    const blob = new Blob([html],{type:"text/html;charset=utf-8"})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href=url; a.download=filename
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }
  const downloadHTML = () => triggerDL(
    buildQuoteHTML(quote, calc, settings, currency, usdRate),
    buildFilename("Internal")
  )
  const downloadPortal = () => triggerDL(
    buildPortalHTML(quote, calc, settings),
    buildFilename("Client")
  )
  const printAsPDF = () => {
    // window.open is blocked in sandboxed environments — download instead and guide user
    downloadPortal()
    setPrintNotice(true)
    setTimeout(()=>setPrintNotice(false), 7000)
  }

  const openWhatsApp = () => {
    const p = quote.proj||{}
    const phone = (p.ownerPhone||"").replace(/[^0-9]/g,"")
    const name  = p.ownerName||p.client||"there"
    const msg = encodeURIComponent(
      `Dear ${name},\n\n`+
      `Please find attached the CED Africa AV Design Services Quotation for *${quote.projectName}* (Ref: ${quote.ref}).\n\n`+
      `*Grand Total:* ${fmt(calc.grand)} (inc. VAT 7.5%)\n`+
      `*Valid for:* 30 days\n\n`+
      `We have attached the Client Portal file to this message. Open it in your browser to review the full quotation and sign to accept.\n\n`+
      `For any questions please call us on 0808 666 2168 or reply here.\n\n`+
      `Warm regards,\n${quote.designerName||"CED Africa Design Studio"}`
    )
    const url = phone
      ? `https://wa.me/${phone.startsWith("0")?("234"+phone.slice(1)):phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`
    window.open(url, "_blank")
  }

  const openMailClient = async () => {
    const proj = quote.proj||{}
    const isSpecQ = quote.quoteType==="specifier"

    // Recipient — plain email, NOT uri-encoded (mailto: scheme doesn't want that)
    const to = isSpecQ
      ? (proj.specifierType==="architect" ? proj.archEmail : proj.mepEmail)||""
      : proj.ownerEmail||""

    // Greeting name
    const greeting = isSpecQ
      ? (proj.specifierType==="architect" ? proj.archContact : proj.mepContact)||proj.client||"Specifier"
      : proj.ownerName||proj.client||"Client"

    // CC — studio email + lead email always; add project contacts for residential
    const studioCC = settings.studioEmail||"design@ced.africa"
    const leadCC   = settings.leadEmail||"tonyemelukwe@ced.africa"
    const allCC = [
      studioCC,
      leadCC,
      ...(!isSpecQ ? [proj.archEmail,proj.mepEmail].filter(Boolean) : [])
    ].filter(Boolean)

    // Fee line
    const feeLine = isSpecQ
      ? "Stage 1: NGN 0 (Professional Courtesy - Complimentary)"
      : "Grand Total (inc. VAT): NGN "+Math.round(calc.grand).toLocaleString("en-NG")

    const dateLabel = proj.date||new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})

    // Subject — plain text, encode it
    const subject = encodeURIComponent("Design Services Quotation — "+quote.projectName+" — "+quote.ref)

    // Body — use %0D%0A for line breaks (required by RFC 6068 for mailto)
    const NL = "%0D%0A"
    const bodyParts = [
      "Dear "+greeting+",",
      "",
      "Please find attached the CED Africa AV Consulting Design Services Quotation for "+(quote.projectName||"your project")+" (Ref: "+quote.ref+").",
      "",
      "QUOTATION SUMMARY",
      "Project:   "+(quote.projectName||"--"),
      "Reference: "+quote.ref,
      feeLine,
      "Valid for: 30 days from "+dateLabel,
      "",
      "HOW TO RESPOND",
      "A Client Portal file (HTML) is attached to this email.",
      "Open it in any browser -- it contains the full quotation with an Accept or Decline button.",
      "Alternatively, reply directly to this email to accept or request changes.",
      "",
      "For any questions:",
      "Tel: 0808 666 2168",
      "Email: "+(settings.studioEmail||"design@ced.africa"),
      "",
      "Warm regards,",
      quote.designerName||"CED Africa Design Studio",
      "CED Africa AV Design Studio",
      "17 Adeyemo Alakija St, Victoria Island, Lagos",
    ]
    // Encode each line individually, then join with literal %0D%0A
    const body = bodyParts.map(l => encodeURIComponent(l)).join(NL)

    // Build mailto — To is plain, subject/CC/body are encoded
    // CC addresses: encode each, but keep @ as %40 is fine inside query params
    const ccStr = allCC.join(",")
    const mailtoURL = "mailto:"+to+"?subject="+subject+"&cc="+encodeURIComponent(ccStr)+"&body="+body

    const a = document.createElement("a")
    a.href = mailtoURL
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(async()=>{ await action("sent"); setShowEmailModal(false) }, 2000)
  }


  const s = STATUS[quote.status]||STATUS.draft

  return (
    <div style={{maxWidth:960,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text}}>{quote.projectName||"Untitled"}</h2>
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}>
            <Badge status={quote.status}/>
            <span style={{fontSize:13,color:C.text3}}>{quote.ref}</span>
            <span style={{fontSize:13,color:C.text3}}>v{quote.version||1}</span>
            {quote.quoteType==="specifier"&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6,background:"#8B5CF620",color:"#7C3AED",border:"1px solid #8B5CF640"}}>📐 Specifier</span>}
            {quote.quoteType==="specifier"&&quote.convertedToId&&<span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:6,background:"#F0FDF4",color:"#16A34A",border:"1px solid #16A34A40"}}>✓ Converted</span>}
            {quote.convertedFromId&&<span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:6,background:"#EFF6FF",color:"#2563EB",border:"1px solid #2563EB40"}}>🏠 From Specifier</span>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1px solid ${C.border}`}}>
            {["NGN","USD"].map(c=>(
              <button key={c} onClick={()=>setCurrency(c)}
                style={{padding:"7px 14px",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",
                  background:currency===c?AMBER:"transparent",color:currency===c?"#fff":C.text2}}>
                {c==="NGN"?"₦ NGN":"$ USD"}
              </button>
            ))}
          </div>
          {currency==="USD"&&<span style={{fontSize:11,color:C.text3}}>@ ₦{usdRate.toLocaleString("en-NG")}/$1</span>}
          <Btn onClick={onBack} variant="ghost">← Quotes</Btn>
        </div>
      </div>

      {/* Specifier notice */}
      {quote.quoteType==="specifier"&&(
        <div style={{padding:"10px 16px",borderRadius:9,background:"#F5F3FF",border:"1px solid #8B5CF640",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}>📐</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"#5B21B6"}}>Specifier Quote — Unbillable</div>
            <div style={{fontSize:12,color:"#7C3AED",marginTop:1}}>
              Full Stage 1 fee: ₦{Math.round(quote.calcSnapshot?.subtotal||0).toLocaleString("en-NG")} · 100% Professional Courtesy Discount · Amount invoiced: ₦0
            </div>
          </div>
        </div>
      )}

      {/* Workflow actions */}
      <Card style={{padding:16,marginBottom:20,border:`2px solid ${s.color}40`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:2}}>Status: <span style={{color:s.color}}>{s.label}</span></div>
            <div style={{fontSize:12,color:C.text3}}>
              Created {quote.createdAt?dateStr(quote.createdAt):"—"} · Submitted {quote.submittedAt?dateStr(quote.submittedAt):"not yet"} · Designer: {quote.designerName}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {/* Edit — designer on draft/rejected, lead always */}
            {((quote.status==="draft"||quote.status==="rejected")&&quote.designerId===session.userId)||(session.role==="lead")?(
              <Btn onClick={onEdit} variant="ghost" small>✏ Edit Quote</Btn>
            ):null}
            {/* Lead actions */}
            {session.role==="lead"&&quote.status==="pending_approval"&&(
              <>
                <Btn onClick={()=>action("approved")} variant="success" disabled={saving}>✓ Approve</Btn>
                <Btn onClick={()=>setShowRej(true)} variant="danger" disabled={saving}>✗ Reject</Btn>
              </>
            )}

            {session.role==="lead"&&quote.status==="sent"&&(
              <>
                <Btn onClick={()=>action("accepted")} variant="success" disabled={saving}>Client Accepted</Btn>
                <Btn onClick={()=>action("declined")} variant="ghost" disabled={saving}>Client Declined</Btn>
              </>
            )}
            {(quote.status==="approved"||quote.status==="sent"||quote.status==="accepted")&&(
              <>
                <Btn onClick={printAsPDF} variant="outline">🖨 Print / PDF</Btn>
                <Btn onClick={downloadPortal} variant="ghost" small>⬇ Client</Btn>
                <Btn onClick={downloadHTML} variant="ghost" small>⬇ Internal</Btn>
              </>
            )}
            {session.role==="lead"&&["sent","accepted","declined"].includes(quote.status)&&
             settings.rate&&quote.rateOverride&&quote.rateOverride!==settings.rate&&(
              <Btn
                onClick={async()=>{
                  const now=Date.now()
                  const oldRate=quote.rateOverride||settings.rate
                  const newRate=settings.rate
                  const histEntry={timestamp:now,action:"rate_manually_applied",by:session.userId,byName:session.name,notes:`Studio Lead manually applied current rate ₦${newRate.toLocaleString("en-NG")}/hr (was ₦${oldRate.toLocaleString("en-NG")}/hr)`}
                  const updated={...quote,rateOverride:newRate,rateChangeNotice:false,history:[...(quote.history||[]),histEntry]}
                  const quotes=await store.getQuotes()
                  await store.saveQuotes(quotes.map(q=>q.id===quote.id?updated:q))
                  setQuote(updated)
                  onUpdate(updated)
                }}
                variant="ghost" small style={{border:`1px solid ${AMBER}`,color:AMBER}}
              >
                Apply Current Rate (₦{(settings.rate||80000).toLocaleString("en-NG")}/hr)
              </Btn>
            )}
          </div>
        </div>

        {/* Rejection notes input */}
        {showRej&&(
          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border2}`}}>
            <IL label="Rejection Notes (required — will be shown to the designer)">
              <textarea value={rejNotes} onChange={e=>setRejNotes(e.target.value)} rows={3} placeholder="Explain what needs to be corrected before this quote can be approved..." style={{...inp(),resize:"vertical"}}/>
            </IL>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>rejNotes.trim()&&action("rejected",rejNotes)} disabled={!rejNotes.trim()||saving} variant="danger">Confirm Rejection</Btn>
              <Btn onClick={()=>setShowRej(false)} variant="ghost">Cancel</Btn>
            </div>
          </div>
        )}

        {/* Rejection notes display */}
        {quote.status==="rejected"&&quote.rejectionNotes&&(
          <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"#fef2f2",border:`1px solid ${C.red}30`}}>
            <div style={{fontSize:12,fontWeight:600,color:C.red,marginBottom:3}}>Returned with notes:</div>
            <div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>{quote.rejectionNotes}</div>
          </div>
        )}
        {quote.rateChangeNotice&&quote.status==="approved"&&(
          <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:`${AMBER}10`,border:`1px solid ${AMBER}40`}}>
            <div style={{fontSize:12,fontWeight:600,color:AMBER,marginBottom:3}}>⚠ Labour rate was updated after this quote was approved</div>
            <div style={{fontSize:12,color:C.text2,lineHeight:1.6}}>
              This quote has been automatically updated to the current rate of ₦{(quote.rateOverride||settings.rate||80000).toLocaleString("en-NG")}/hr. Review the updated figures before sending to the client.
            </div>
          </div>
        )}
      </Card>

      {/* Print / PDF notice — shown for 6s after printAsPDF clicked */}
      {printNotice&&(
        <div style={{padding:"12px 16px",borderRadius:9,background:`${C.green}12`,border:`1px solid ${C.green}40`,marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}>✅</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.green}}>Client file downloaded — ready to print as PDF</div>
            <div style={{fontSize:12,color:C.text2,marginTop:2}}>
              Open the downloaded <code style={{background:C.bg2,padding:"1px 5px",borderRadius:4,fontSize:11}}>_Client_</code> file in your browser,
              then press <strong>Ctrl+P</strong> (Windows) or <strong>⌘P</strong> (Mac) → select <strong>"Save as PDF"</strong> as the printer.
            </div>
          </div>
        </div>
      )}

      {/* Portal link card */}
      {(quote.status==="approved"||quote.status==="sent"||quote.status==="accepted")&&(
        <Card style={{padding:16,marginBottom:20,border:`2px solid ${quote.status==="accepted"?C.green:AMBER}40`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
            <div style={{flex:1}}>
              {quote.status==="accepted"?(
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:C.green,marginBottom:3}}>✅ Quotation Accepted</div>
                  <div style={{fontSize:12,color:C.text3}}>Accepted by <strong>{quote.clientSignedBy}</strong> on {dateStr(quote.clientSignedAt)} · Ref: {quote.ref}</div>
                </div>
              ):(
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:3}}>📄 Client File</div>
                  <div style={{fontSize:12,color:C.text2,lineHeight:1.5}}>
                    Download and email this file to the client. They open it in any browser to review and respond — no login required.
                    Filename follows CED convention: <code style={{fontSize:11,background:C.bg3,padding:"1px 5px",borderRadius:4}}>{buildFilename("Client")}</code>
                  </div>
                </div>
              )}
            </div>
            {quote.status==="approved"&&session.role==="lead"&&(
              <>
                {!isSpecifier&&<Btn onClick={()=>setShowEmailModal(true)} variant="blue">📧 Email to Client</Btn>}
                {!isSpecifier&&<Btn onClick={openWhatsApp} variant="ghost" style={{color:"#25D366",border:"1px solid #25D366"}}>
                  <span style={{fontSize:15}}>💬</span> WhatsApp
                </Btn>}
                {isSpecifier&&!quote.convertedToId&&onConvert&&(
                  <Btn onClick={()=>onConvert(quote)}
                    style={{background:"#7C3AED",color:"#fff",border:"1px solid #7C3AED"}}>
                    🏠 Convert to Residential
                  </Btn>
                )}
                {isSpecifier&&quote.convertedToId&&(
                  <div style={{padding:"6px 14px",borderRadius:8,background:"#F0FDF4",border:"1px solid #16A34A50",fontSize:13,fontWeight:600,color:"#16A34A"}}>
                    ✓ Already Converted to Residential
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Quote summary */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
        {[["Total Hours",hrs(calc.totalH)],["Design Fee",fmt(calc.subtotal)],["Grand Total (inc VAT)",fmt(calc.grand)]].map(([l,v])=>(
          <Card key={l}><div style={{padding:16,textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:700,color:AMBER}}>{v}</div>
            <div style={{fontSize:12,color:C.text3,marginTop:3}}>{l}</div>
          </div></Card>
        ))}
      </div>

      {/* Stage breakdown */}
      <SectionTitle>Design Stage Breakdown</SectionTitle>
      <Card style={{marginBottom:20}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:C.bg2}}>
              {["Stage","Hours","% of Total","Fee (excl. VAT)"].map((h,i)=>(
                <th key={h} style={{padding:"9px 14px",fontSize:11,fontWeight:600,color:C.text3,textAlign:i===0?"left":"right",borderBottom:`1px solid ${C.border}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calc.stageList.filter(st=>!isSpecifier||st.id==="s1").map(st=>(
              <tr key={st.id} style={{borderTop:`1px solid ${C.border2}`}}>
                <td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:st.color}}/>
                    <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Stage {st.num} — {st.name}</div><div style={{fontSize:11,color:C.text3}}>{st.sub}</div></div>
                  </div>
                </td>
                <td style={{padding:"10px 14px",textAlign:"right",fontSize:13,fontWeight:600,color:C.text}}>{hrs(st.hours)}</td>
                <td style={{padding:"10px 14px",textAlign:"right",fontSize:12,color:C.text2}}>{calc.totalH>0?((st.hours/calc.totalH)*100).toFixed(0)+"%":"—"}</td>
                <td style={{padding:"10px 14px",textAlign:"right",fontSize:13,fontWeight:600,color:C.text}}>{ngn(st.fee)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Email Modal */}
      {showEmailModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:C.bg,borderRadius:14,padding:24,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h2 style={{margin:0,fontSize:17,fontWeight:600,color:C.text}}>Send Quotation to Client</h2>
                <p style={{margin:"3px 0 0",fontSize:12,color:C.text3}}>Two-step process: download the portal file, then open your email client</p>
              </div>
              <button onClick={()=>setShowEmailModal(false)} style={{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",fontSize:18,cursor:"pointer",color:C.text3}}>×</button>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:8}}>Recipients</div>
              {(()=>{
                const isSpecQ=quote.quoteType==="specifier"
                const st=quote.proj?.specifierType
                return isSpecQ
                  ?[["To — "+(st==="architect"?"Architect":"MEP Consultant"),st==="architect"?quote.proj?.archEmail:quote.proj?.mepEmail||"⚠ Not set"]]
                  :[["To — Project Owner",quote.proj?.ownerEmail||"⚠ Not set"],...(quote.proj?.archEmail?[["CC — Architect",quote.proj.archEmail]]:[]),...(quote.proj?.mepEmail?[["CC — MEP Consultant",quote.proj.mepEmail]]:[]) ]
              })().map(([label,email])=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"7px 12px",borderRadius:6,background:C.bg2,border:`1px solid ${C.border2}`,marginBottom:5}}>
                  <span style={{fontSize:12,color:C.text3,minWidth:170}}>{label}</span>
                  <span style={{fontSize:13,fontWeight:500,color:email.startsWith("⚠")?C.red:C.text}}>{email}</span>
                </div>
              ))}
            </div>

            <div style={{padding:16,borderRadius:10,background:`${AMBER}08`,border:`1px solid ${AMBER}40`,marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>
                <span style={{background:AMBER,color:"#fff",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,marginRight:8}}>STEP 1</span>
                Download the Client Portal File
              </div>
              <div style={{fontSize:12,color:C.text2,marginBottom:12,lineHeight:1.6}}>
                A self-contained HTML file your client opens in any browser. Contains the full quote with deliverable descriptions, fee summary, and Accept / Decline buttons. No login, no app, no internet required after download.
              </div>
              <Btn onClick={downloadPortal} variant="primary">⬇ Download Client File (.html)</Btn>
            </div>

            <div style={{padding:16,borderRadius:10,background:`${C.blue}08`,border:`1px solid ${C.blue}40`,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>
                <span style={{background:C.blue,color:"#fff",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,marginRight:8}}>STEP 2</span>
                Open Your Email Client and Send
              </div>
              <div style={{fontSize:12,color:C.text2,marginBottom:10,lineHeight:1.6}}>
                Opens Outlook, Gmail, or your default email app pre-filled with subject, body, and all recipients. Attach the portal file from Step 1, then click send. The quote status updates to "Sent to Client" automatically.
              </div>
              {(()=>{
                const isSpecModal = quote.quoteType==="specifier"
                const recipientEmail = isSpecModal
                  ? (quote.proj?.specifierType==="architect" ? quote.proj?.archEmail : quote.proj?.mepEmail)||""
                  : quote.proj?.ownerEmail||""
                const recipientLabel = isSpecModal
                  ? (quote.proj?.specifierType==="architect" ? "Architect" : "MEP Consultant")+" email"
                  : "Project Owner email"
                return !recipientEmail ? (
                  <div style={{padding:"10px 14px",borderRadius:8,background:"#fef2f2",border:`1px solid ${C.red}30`,marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.red,marginBottom:4}}>⚠ {recipientLabel} is missing</div>
                    <div style={{fontSize:12,color:C.text2,marginBottom:8,lineHeight:1.5}}>
                      {isSpecModal
                        ? "The specifier firm email is not set. Edit the quote to update the specifier details."
                        : "This quote was saved without a Project Owner email. Edit the quote to add it before sending."}
                    </div>
                    <Btn onClick={()=>{ setShowEmailModal(false); onEdit() }} variant="danger" small>
                      ✏ Edit Quote to Add Email
                    </Btn>
                  </div>
                ) : null
              })()}
              {(()=>{
                const isSpecModal = quote.quoteType==="specifier"
                const recipientEmail = isSpecModal
                  ? (quote.proj?.specifierType==="architect" ? quote.proj?.archEmail : quote.proj?.mepEmail)||""
                  : quote.proj?.ownerEmail||""
                return (
                  <Btn onClick={openMailClient} variant="blue" disabled={!recipientEmail}>
                    📧 Open Email Client &amp; Mark as Sent
                  </Btn>
                )
              })()}
              <div style={{fontSize:11,color:C.text3,marginTop:6,lineHeight:1.5}}>Works with Outlook, Gmail app, Apple Mail, or any default email client on your PC.</div>
            </div>

            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <Btn onClick={()=>setShowEmailModal(false)} variant="ghost">Close</Btn>
            </div>
          </div>
        </div>
      )}


      {/* History */}
      <SectionTitle>Quote History &amp; Version Log</SectionTitle>
      <Card>
        {(quote.history||[]).length===0&&(
          <div style={{padding:"16px",fontSize:13,color:C.text3,textAlign:"center"}}>No history yet.</div>
        )}
        {(quote.history||[]).slice().reverse().map((h,i,arr)=>{
          const icons={"created":"📝","saved":"💾","submitted":"📤","approved":"✅","rejected":"❌","sent":"📧","accepted":"🎉","declined":"❌","updated":"✏️","rate_manually_applied":"💱"}
          const isSnap=h.snapGrand>0
          const prev=arr[i+1]
          const feeChanged=isSnap&&prev?.snapGrand&&Math.abs(h.snapGrand-prev.snapGrand)>1
          return(
            <div key={i} style={{display:"flex",gap:12,padding:"12px 16px",borderBottom:i<arr.length-1?`1px solid ${C.border2}`:"none",alignItems:"flex-start"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`${AMBER}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                  {icons[h.action]||"•"}
                </div>
                {h.version&&<div style={{fontSize:10,fontWeight:700,color:AMBER,background:`${AMBER}15`,padding:"1px 6px",borderRadius:8}}>v{h.version}</div>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:6}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,textTransform:"capitalize"}}>{h.action.replace(/_/g," ")}</div>
                    <div style={{fontSize:11,color:C.text3}}>by {h.byName} · {dateStr(h.timestamp)} {timeStr(h.timestamp)}</div>
                  </div>
                  {isSnap&&(
                    <div style={{fontSize:11,textAlign:"right"}}>
                      <div style={{fontWeight:600,color:feeChanged?AMBER:C.text}}>{fmt(h.snapGrand)}</div>
                      <div style={{color:C.text3}}>{h.snapHours?.toFixed(1)} hrs · {h.snapRooms} rooms</div>
                      {feeChanged&&prev?.snapGrand&&(
                        <div style={{color:h.snapGrand>prev.snapGrand?"#ef4444":"#16A34A",fontWeight:600,fontSize:10}}>
                          {h.snapGrand>prev.snapGrand?"▲":"▼"} {fmt(Math.abs(h.snapGrand-prev.snapGrand))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {h.notes&&<div style={{fontSize:12,color:C.text2,marginTop:4,lineHeight:1.5,padding:"6px 10px",background:C.bg2,borderRadius:6}}>{h.notes}</div>}
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ── Performance Dashboard ──────────────────────────────────
function Dashboard({session, quotes, onOpenQuote}) {
  const [tab, setTab] = useState("projects")

  return (
    <div>
      {/* Tab bar */}
      <div style={{display:"flex",gap:3,background:C.bg2,borderRadius:10,padding:3,border:`1px solid ${C.border}`,marginBottom:24,width:"fit-content"}}>
        {[["projects","🏗 Projects"],["performance","📊 Studio Performance"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:"7px 20px",borderRadius:8,border:"none",fontSize:13,cursor:"pointer",
              background:tab===k?AMBER:"transparent",color:tab===k?"#fff":C.text2,fontWeight:tab===k?600:400,transition:"all .15s"}}>
            {l}
          </button>
        ))}
      </div>
      {tab==="projects"   && <ProjectsDashboard session={session} quotes={quotes} onOpenQuote={onOpenQuote}/>}
      {tab==="performance"&& <PerformanceDashboard session={session} quotes={quotes}/>}
    </div>
  )
}

const DISC_SYSTEMS = [
  {cat:"Security & Safety", systems:[
    {id:"sec",  label:"Security System",
     desc:"Your home knows when something is wrong. Silent sensors on every door and window alert you the moment an unauthorised entry is attempted — whether you are asleep upstairs or travelling abroad. Peace of mind, always on."},
    {id:"fire", label:"Fire & Safety System",
     desc:"Smoke, heat, and carbon monoxide detected in seconds — not minutes. Smart detectors that talk to each other, so an alarm in the kitchen wakes everyone in the home, not just the person nearby."},
    {id:"icom", label:"IP Intercom & Video Doorbell",
     desc:"See and speak to whoever is at your gate or front door — from your phone, your bedroom TV, or your kitchen screen. Let in the housekeeper while you are at the office. Never miss a delivery again."},
    {id:"tel",  label:"IP Telephony",
     desc:"A professional phone system for your home — internal extensions between rooms, a single number that rings everywhere, and crystal-clear calls through your home network rather than a mobile signal."},
    {id:"cctv", label:"CCTV Surveillance Cameras",
     desc:"Live and recorded video of every corner of your property — driveway, gate, garden, pool — viewable from your phone anywhere in the world. Know exactly what happened and when."},
    {id:"acc",  label:"Smart Access Control",
     desc:"No more keys. Your front door, gate, and inner doors open with a fingerprint, PIN, phone tap, or automatically as you approach. Grant and revoke access to staff, guests, or family instantly — from anywhere."},
  ]},
  {cat:"Comfort & Convenience", systems:[
    {id:"ltg",  label:"Smart Lighting Control",
     desc:"Every light in your home, exactly as you want it — brightness, warmth, and colour tailored to the time of day, the mood, or the occasion. Arrive home to a lit entrance. Movie night dims the living room automatically. One tap sets the whole house to sleep mode."},
    {id:"hvac", label:"Smart Climate Control",
     desc:"Your home learns when you wake, when you arrive, and how you like it — and adjusts the temperature before you even ask. Cool rooms are waiting for you. Energy is not wasted cooling spaces nobody is in."},
    {id:"blind",label:"Motorised Blinds & Curtains",
     desc:"Blinds that open with the sunrise and close at sunset. Curtains that draw themselves when a movie starts. Full privacy at night with a single voice command — or on a schedule you set once and forget."},
  ]},
  {cat:"Entertainment & AV", systems:[
    {id:"audio",label:"Multi-Room Audio",
     desc:"Your favourite music follows you through the house — from the master bedroom to the kitchen to the poolside — all in perfect sync, or different music in each space simultaneously. No wires, no fuss, just sound."},
    {id:"video",label:"Multi-Room Video",
     desc:"Watch any channel, streaming service, or recorded content on any TV in any room. What is playing in the living room can continue in the bedroom. Every screen connected, every room entertained."},
    {id:"media",label:"Dedicated Media Room AV",
     desc:"A dedicated room built for cinema-quality sound and picture — large-format display, surround sound, acoustic treatment, and seating designed around the experience. The best seat in the house, in your house."},
    {id:"cinema",label:"Home Cinema Room",
     desc:"A purpose-designed private cinema inside your home. 4K projection, Dolby Atmos surround sound, acoustic panels, tiered seating, motorised screen — the full theatre experience with your own rules, your own timing, and your own comfort."},
    {id:"ctrl", label:"Home Control System",
     desc:"One app — or one voice command — controls everything. Lights, climate, security, blinds, audio, video. Arrive home and your whole house responds. Leave and everything turns off automatically. The intelligence that ties your entire home together."},
  ]},
  {cat:"Infrastructure", systems:[
    {id:"net",  label:"Network Infrastructure & Wi-Fi",
     desc:"The invisible backbone that makes everything else work — fast, reliable Wi-Fi in every room, every corner, and every outdoor space. No dead zones. No buffering. Enough bandwidth for every screen, device, and smart system running simultaneously."},
    {id:"pwr",  label:"Power Management & Backup",
     desc:"Your smart home stays alive even when the grid does not. Battery backup and intelligent power management keep your critical systems — security, lighting, network — running through outages. In Nigeria, this is not optional."},
  ]},
]

const DISC_ZONES = [
  {id:"pub",   label:"Public Entertainment Areas",
   hint:"Main Living, Dining, Dry Kitchen, Media Room, Games Room, Pool, Outdoor Patio, Home Cinema",
   rooms:["Main Living","Dining","Dry Kitchen","Media Room","Home Cinema","Garden","Outdoor Patio","Swimming Pool","Main Terrace"]},
  {id:"priv",  label:"Private Entertainment Areas",
   hint:"Master's Lounge, Private Lounge, Family Lounge, Study, Library",
   rooms:["Other Living","Home Office"]},
  {id:"primary",label:"Primary Bedrooms",
   hint:"Master Bedroom + Ensuite + WIC, Madam's Bedroom + Ensuite + WIC",
   rooms:["Main Bedroom","Main Ensuite","Main WIC"]},
  {id:"secondary",label:"Secondary Bedrooms",
   hint:"Guest Bedrooms, Kids Bedrooms, Other Bedrooms and Ensuites",
   rooms:["Other Bedroom","Other Ensuite","Other WIC"]},
  {id:"boh",   label:"Back of House",
   hint:"Wet Kitchen, Servant Quarters, Boys Quarters, Gate House",
   rooms:["Wet Kitchen","Gate House","Servant Room","Transient Room"]},
  {id:"wellness",label:"Wellness Areas",
   hint:"Gym, Spa, Wellness Room, Sauna",
   rooms:["Gym","Wellness Room"]},
  {id:"utility",label:"Utility & Perimeter",
   hint:"Server Room, Store, Box Room, Hallways, Stairs, Exterior, Perimeter",
   rooms:["Server Room","Hallway","Stairs","Exterior","Perimeter","Entrance Foyer"]},
]


// ── Discovery Module Component ────────────────────────────────
function DiscoveryModule({session, settings, discoveries, onRefresh, onSeedQuote}) {
  const [view, setView]       = useState("list")   // list | new | detail
  const [active, setActive]   = useState(null)
  const [saving, setSaving]   = useState(false)
  const [importErr, setImportErr] = useState("")
  const [form, setForm]       = useState({clientName:"", projectName:"", address:"", clientEmail:""})

  const createDiscovery = async () => {
    if(!form.clientName||!form.projectName){setImportErr("Client name and project name are required.");return}
    setSaving(true)
    const disc = {
      id: uid(),
      clientName: form.clientName,
      projectName: form.projectName,
      address: form.address,
      clientEmail: form.clientEmail,
      designerId: session.userId,
      designerName: session.name,
      status: "sent",
      createdAt: Date.now(),
      response: null,
      responseAt: null,
    }
    const all = await store.getDiscoveries()
    await store.saveDiscoveries([...all, disc])
    // Generate and download the HTML form
    const html = buildDiscoveryHTML(disc, settings)
    const blob = new Blob([html],{type:"text/html;charset=utf-8"})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = `CED_Discovery_${form.clientName.replace(/\s+/g,"-")}_${disc.id.slice(0,6)}.html`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    await onRefresh()
    setForm({clientName:"",projectName:"",address:"",clientEmail:""})
    setView("list")
    setSaving(false)
  }

  const importResponse = async (file) => {
    setImportErr("")
    try {
      const text = await file.text()
      const resp = JSON.parse(text)
      if(!resp.discId) throw new Error("Invalid file — not a CED Discovery response.")
      const all = await store.getDiscoveries()
      const disc = all.find(d=>d.id===resp.discId)
      if(!disc) throw new Error("Discovery ID not found. Was this form created in this platform?")
      const updated = all.map(d=>d.id===resp.discId?{...d,response:resp,status:"responded",responseAt:Date.now()}:d)
      await store.saveDiscoveries(updated)
      await onRefresh()
      setActive({...disc, response:resp, status:"responded"})
      setView("detail")
    } catch(e) {
      setImportErr(e.message)
    }
  }

  const seedQuote = (disc) => {
    const r = disc.response
    if(!r) return
    // Map zones to representative room objects for Quote Builder
    // Each selected zone produces canonical room entries the designer refines
    const ZONE_TO_ROOMS = {
      pub:     [{name:"Main Living Room",locType:"Main Living"},{name:"Dining Room",locType:"Dining"},{name:"Dry Kitchen",locType:"Dry Kitchen"},{name:"Main Terrace",locType:"Main Terrace"}],
      priv:    [{name:"Family Lounge",locType:"Other Living"},{name:"Study",locType:"Home Office"}],
      primary: [{name:"Master Bedroom",locType:"Main Bedroom"},{name:"Master Ensuite",locType:"Main Ensuite"},{name:"Master WIC",locType:"Main WIC"}],
      secondary:[{name:"Guest Bedroom",locType:"Other Bedroom"},{name:"Guest Ensuite",locType:"Other Ensuite"}],
      boh:     [{name:"Wet Kitchen",locType:"Wet Kitchen"},{name:"Gate House",locType:"Gate House"}],
      wellness:[{name:"Gym",locType:"Gym"},{name:"Wellness Room",locType:"Wellness Room"}],
      utility: [{name:"Server Room",locType:"Server Room"},{name:"Hallway",locType:"Hallway"},{name:"Exterior",locType:"Exterior"}],
    }
    // Add Media Room / Home Cinema if selected in zones
    const extraRooms = []
    const zones = r.zones||{}
    const pubSystems = zones.pub||[]
    if(pubSystems.includes("media"))  extraRooms.push({name:"Media Room",locType:"Media Room"})
    if(pubSystems.includes("cinema")) extraRooms.push({name:"Home Cinema",locType:"Home Cinema",cinRender:true})

    const selectedZones = Object.keys(zones)
    var roomList = []
    selectedZones.forEach(function(zid){
      var zoneRooms = ZONE_TO_ROOMS[zid]||[]
      zoneRooms.forEach(function(rm){ roomList.push(rm) })
    })
    roomList = [...roomList, ...extraRooms]
    const rooms = roomList.map(rm=>({...rm, id:uid(), sqm:""}))
    const projSeed = {
      name: r.projName||disc.projectName,
      client: r.clientName||disc.clientName,
      address: r.address||disc.address||"",
      ownerName: r.clientName||disc.clientName,
      ownerEmail: r.ownerEmail||disc.clientEmail||"",
      ownerPhone: "",
      ref: `CED/AVC/${new Date().getFullYear()}/${String(Math.floor(Math.random()*900)+100)}`,
      quoteType:"residential",
      archCompany:"",archContact:"",archEmail:"",archPhone:"",
      mepCompany:"",mepContact:"",mepEmail:"",mepPhone:"",
      specifierId:"",specifierType:"",
    }
    onSeedQuote(rooms, projSeed)
  }

  const niceLabel = {not_interested:"Not Interested", nice_to_have:"Nice to Have", must_have:"Must Have"}
  const niceColor = {not_interested:C.text3, nice_to_have:AMBER, must_have:C.green}
  const budgetLabel = {value:"Value",standard:"Standard",premium:"Premium",ultra:"Ultra Premium"}

  const STATUS_DISC = {
    sent:      {label:"Form Sent",        color:C.blue},
    responded: {label:"Response Received",color:C.green},
    converted: {label:"Quote Generated",  color:AMBER},
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,color:C.text}}>Client Discovery</h2>
          <p style={{margin:"4px 0 0",fontSize:14,color:C.text2}}>Send discovery forms to clients, import their responses, and seed pre-scoped quotes.</p>
        </div>
        {view==="list"&&(
          <Btn onClick={()=>{setView("new");setImportErr("")}}>+ New Discovery</Btn>
        )}
        {view!=="list"&&(
          <Btn onClick={()=>{setView("list");setImportErr("")}} variant="ghost">← Back</Btn>
        )}
      </div>

      {/* New Discovery Form */}
      {view==="new"&&(
        <Card style={{padding:24,maxWidth:600}}>
          <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:600,color:C.text}}>Create Discovery Form</h3>
          <p style={{fontSize:13,color:C.text2,marginBottom:20,lineHeight:1.6}}>
            Fill in the client details below. A personalised HTML discovery form will be downloaded.
            Email it to your client — they fill it in their browser and send you back a response file.
          </p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <IL label="Client Full Name *">
              <input value={form.clientName} onChange={e=>setForm({...form,clientName:e.target.value})}
                placeholder="e.g. Toochukwu Onyemelukwe" style={inp()}/>
            </IL>
            <IL label="Client Email">
              <input value={form.clientEmail} onChange={e=>setForm({...form,clientEmail:e.target.value})}
                placeholder="client@email.com" style={inp()}/>
            </IL>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
            <IL label="Project Name *">
              <input value={form.projectName} onChange={e=>setForm({...form,projectName:e.target.value})}
                placeholder="e.g. Vanilla" style={inp()}/>
            </IL>
            <IL label="Property Address">
              <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}
                placeholder="Street, City" style={inp()}/>
            </IL>
          </div>
          {importErr&&<div style={{fontSize:13,color:C.red,marginBottom:12,padding:"8px 12px",background:"#FEF2F2",borderRadius:8}}>{importErr}</div>}
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={createDiscovery} disabled={saving}>{saving?"Generating...":"⬇ Generate & Download Form"}</Btn>
            <Btn onClick={()=>{setView("list");setImportErr("")}} variant="ghost">Cancel</Btn>
          </div>
          <p style={{fontSize:12,color:C.text3,marginTop:12,lineHeight:1.6}}>
            The downloaded HTML file is emailed to your client. When they complete it, they download a .json response file and email it back to you. Import it below.
          </p>
        </Card>
      )}

      {/* Detail view */}
      {view==="detail"&&active&&(()=>{
        const r = active.response
        const ds = STATUS_DISC[active.status]||STATUS_DISC.sent
        return (
          <div>
            <Card style={{padding:20,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <span style={{fontSize:20,fontWeight:700,color:C.text}}>{active.clientName}</span>
                    <span style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:10,background:ds.color+"20",color:ds.color,border:`1px solid ${ds.color}40`}}>{ds.label}</span>
                  </div>
                  <div style={{fontSize:13,color:C.text2}}>{active.projectName}{active.address?" · "+active.address:""}</div>
                  {r&&<div style={{fontSize:12,color:C.text3,marginTop:4}}>
                    Response received · {r.submittedAt?new Date(r.submittedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"}):""}
                  </div>}
                </div>
                {r&&(
                  <Btn onClick={()=>seedQuote(active)} style={{background:"#D97706",color:"#fff",border:"none"}}>
                    🏗 Seed a Quote from this Discovery
                  </Btn>
                )}
              </div>
            </Card>

            {r&&(
              <>
                {/* Lifestyle summary */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
                  <Card style={{padding:16}}>
                    <SectionTitle>Property & Lifestyle</SectionTitle>
                    {[
                      ["WhatsApp", r.ownerWhatsApp],
                      ["Property Type", r.propType],
                      ["Construction Stage", {new_build:"New Build",renovation:"Major Renovation",retrofit:"Retrofit",planning:"Planning Stage"}[r.constructionStage]||r.constructionStage],
                      ["Bedrooms", r.bedrooms],
                      ["Move-in / Completion", r.moveIn],
                      ["Tech Comfort", {simple:"Keep it simple",comfortable:"Comfortable",savvy:"Tech-savvy"}[r.techComfort]||r.techComfort],
                      ["Who Operates", {me:"Myself only",family:"Family members",staff:"Household staff",all:"Everyone"}[r.whoOperates]||r.whoOperates],
                      ["Budget Mindset", budgetLabel[r.budget]||r.budget],
                      ["Timeline", r.timeline],
                    ].filter(([,v])=>v).map(([l,v])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border2}`,fontSize:13}}>
                        <span style={{color:C.text2}}>{l}</span>
                        <span style={{fontWeight:500,color:C.text,textAlign:"right",maxWidth:"60%"}}>{v}</span>
                      </div>
                    ))}
                    {r.lifestyle?.length>0&&(
                      <div style={{marginTop:10}}>
                        <div style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>Lifestyle</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                          {r.lifestyle.map(l=>(
                            <span key={l} style={{fontSize:12,padding:"3px 9px",borderRadius:12,background:`${AMBER}15`,color:AMBER,border:`1px solid ${AMBER}30`,fontWeight:500}}>
                              {({family:"Family",entertain:"Entertainment",wfh:"Work from Home",security:"Security",luxury:"Luxury",wellness:"Wellness"})[l]||l}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {r.cinemaRender&&<div style={{marginTop:8,padding:"8px 12px",background:"#F5F3FF",borderRadius:8,fontSize:13,color:"#7C3AED",fontWeight:600}}>🎬 {r.cinemaRender==="yes"?"Client wants 3D Home Cinema Render":"No 3D Render required"}</div>}
                    {r.smartHomeExp&&(()=>{const expLabel={yes_own:"Currently lives in one",yes_visited:"Has visited/experienced one",no:"No prior experience"}[r.smartHomeExp]||r.smartHomeExp;return <div style={{marginTop:8,padding:"8px 12px",background:C.bg2,borderRadius:8,fontSize:13,color:C.text}}>Smart home experience: <strong>{expLabel}</strong></div>})()}
                    {(r.knownSystems||[]).length>0&&r.knownSystems[0]!=="none"&&<div style={{marginTop:4,padding:"8px 12px",background:C.bg2,borderRadius:8,fontSize:12,color:C.text2}}>Familiar with: {(r.knownSystems||[]).map(s=>({control4:"Control4",crestron:"Crestron",lutron:"Lutron",savant:"Savant",knx:"KNX",google:"Google Home",alexa:"Amazon Alexa"}[s]||s)).join(", ")}</div>}
                    {r.systemPrefs&&<div style={{marginTop:4,padding:"8px 12px",background:C.bg2,borderRadius:8,fontSize:12,color:C.text2,fontStyle:"italic"}}>"{r.systemPrefs}"</div>}
                    {r.archCompany&&<div style={{marginTop:8,padding:"8px 12px",background:C.bg2,borderRadius:8,fontSize:12,color:C.text}}><strong>Architect:</strong> {r.archCompany}{r.archContact?" — "+r.archContact:""}{r.archEmail?" · "+r.archEmail:""}{r.archPhone?" · "+r.archPhone:""}</div>}
                    {r.wishlist&&<div style={{marginTop:8,padding:"10px 12px",background:"#FFFBEB",border:`1px solid ${AMBER}30`,borderRadius:8}}><div style={{fontSize:11,fontWeight:700,color:AMBER,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Technology Wishlist</div><div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>{r.wishlist}</div></div>}
                    {r.notes&&<div style={{marginTop:12,padding:"10px 12px",background:C.bg2,borderRadius:8,fontSize:13,color:C.text2,lineHeight:1.6}}><strong style={{color:C.text}}>Notes:</strong> {r.notes}</div>}
                  </Card>

                  <Card style={{padding:16}}>
                    <SectionTitle>Zone Selections</SectionTitle>
                    {DISC_ZONES.map(z=>{
                      const sys = (r.zones||{})[z.id]||[]
                      if(sys.length===0) return null
                      const allSys = DISC_SYSTEMS.flatMap(g=>g.systems)
                      return(
                        <div key={z.id} style={{marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${C.border2}`}}>
                          <div style={{fontSize:12,fontWeight:700,color:AMBER,marginBottom:5}}>{z.label}</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {sys.map(sid=>{
                              const sysObj=allSys.find(s=>s.id===sid)
                              return <span key={sid} style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:`${AMBER}12`,border:`1px solid ${AMBER}30`,color:C.text}}>{sysObj?.label||sid}</span>
                            })}
                          </div>
                        </div>
                      )
                    })}
                    {r.otherRooms&&<div style={{fontSize:12,color:C.text2,marginTop:8}}><strong>Other:</strong> {r.otherRooms}</div>}
                  </Card>
                </div>

                {/* System ratings */}
                <Card style={{padding:16,marginBottom:16}}>
                  <SectionTitle>System Interest Ratings</SectionTitle>
                  {DISC_SYSTEMS.map(grp=>(
                    <div key={grp.cat} style={{marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",padding:"4px 10px",background:C.bg2,borderRadius:6,marginBottom:8}}>{grp.cat}</div>
                      {grp.systems.map(s=>{
                        const rating = r.systems?.[s.id]
                        const col = niceColor[rating]||C.text3
                        return(
                          <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 6px",borderBottom:`1px solid ${C.border2}`}}>
                            <span style={{fontSize:13,color:C.text}}>{s.label}</span>
                            <span style={{fontSize:12,fontWeight:600,color:col,padding:"3px 10px",borderRadius:10,background:col+"15",border:`1px solid ${col}30`,whiteSpace:"nowrap"}}>
                              {niceLabel[rating]||"Not Rated"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </Card>
              </>
            )}
          </div>
        )
      })()}

      {/* List view */}
      {view==="list"&&(
        <div>
          {/* Import response */}
          <Card style={{padding:16,marginBottom:20,border:`1px solid ${C.blue}30`,background:"#EFF6FF"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.blue,marginBottom:3}}>📥 Import Client Response File</div>
                <div style={{fontSize:12,color:C.text2}}>When your client emails back their .json response file, import it here to view their responses and seed a quote.</div>
              </div>
              <label style={{cursor:"pointer"}}>
                <input type="file" accept=".json" style={{display:"none"}}
                  onChange={e=>{ if(e.target.files[0]) importResponse(e.target.files[0]); e.target.value="" }}/>
                <div style={{padding:"9px 18px",borderRadius:8,background:C.blue,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                  ⬆ Import Response
                </div>
              </label>
            </div>
            {importErr&&<div style={{fontSize:13,color:C.red,marginTop:10,padding:"8px 12px",background:"#FEF2F2",borderRadius:8}}>{importErr}</div>}
          </Card>

          {discoveries.length===0?(
            <Card><div style={{padding:40,textAlign:"center",color:C.text3}}>
              <div style={{fontSize:32,marginBottom:12}}>🔍</div>
              <div style={{fontSize:16,fontWeight:600,marginBottom:6}}>No discovery forms yet</div>
              <div style={{fontSize:14}}>Click <strong>+ New Discovery</strong> to create and send a form to your first client.</div>
            </div></Card>
          ):(
            <Card style={{overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:C.bg2}}>
                    {["Client","Project","Designer","Status","Created","Action"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",fontSize:11,fontWeight:600,color:C.text3,textAlign:"left",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...discoveries].reverse().map((d,i)=>{
                    const ds = STATUS_DISC[d.status]||STATUS_DISC.sent
                    return(
                      <tr key={d.id} style={{borderTop:`1px solid ${C.border2}`,background:i%2===0?"transparent":C.bg2,cursor:"pointer"}}
                        onClick={()=>{setActive(d);setView("detail")}}
                        onMouseOver={e=>e.currentTarget.style.background=`${AMBER}08`}
                        onMouseOut={e=>e.currentTarget.style.background=i%2===0?"transparent":C.bg2}>
                        <td style={{padding:"10px 12px",fontSize:13,fontWeight:600,color:C.text}}>{d.clientName}</td>
                        <td style={{padding:"10px 12px",fontSize:13,color:C.text2}}>{d.projectName}</td>
                        <td style={{padding:"10px 12px",fontSize:12,color:C.text2}}>{d.designerName}</td>
                        <td style={{padding:"10px 12px"}}>
                          <span style={{fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:10,background:ds.color+"20",color:ds.color,border:`1px solid ${ds.color}40`}}>{ds.label}</span>
                        </td>
                        <td style={{padding:"10px 12px",fontSize:12,color:C.text3,whiteSpace:"nowrap"}}>
                          {d.createdAt?new Date(d.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"}):"-"}
                        </td>
                        <td style={{padding:"10px 12px"}} onClick={e=>e.stopPropagation()}>
                          {d.response?(
                            <Btn small onClick={()=>seedQuote(d)} style={{background:"#D97706",color:"#fff",border:"none"}}>Seed Quote</Btn>
                          ):(
                            <Btn small variant="ghost" onClick={()=>{
                              const html=buildDiscoveryHTML(d,settings)
                              const blob=new Blob([html],{type:"text/html;charset=utf-8"})
                              const url=URL.createObjectURL(blob)
                              const a=document.createElement("a")
                              a.href=url;a.download=`CED_Discovery_${d.clientName.replace(/\s+/g,"-")}_${d.id.slice(0,6)}.html`
                              document.body.appendChild(a);a.click()
                              document.body.removeChild(a);URL.revokeObjectURL(url)
                            }}>⬇ Re-download</Btn>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}


// ────────────────────────────────────────────────────────────────
// PROJECTS DASHBOARD — live pipeline + revenue + project table
// ────────────────────────────────────────────────────────────────
function ProjectsDashboard({session, quotes, onOpenQuote}) {
  const [search, setSearch]     = useState("")
  const [statusF, setStatusF]   = useState("all")
  const [sortBy, setSortBy]     = useState("date")   // date | fee | name | status
  const [sortDir, setSortDir]   = useState("desc")
  const [view, setView]         = useState("table")  // table | kanban

  // Attention items — quotes needing action right now
  const now_ms = Date.now()
  const DAY = 86400000
  const attentionItems = [
    ...quotes.filter(q=>q.status==="pending_approval").map(q=>({
      q, type:"approval", icon:"⏳", color:"#D97706",
      msg:`Pending approval — submitted ${Math.floor((now_ms-(q.submittedAt||now_ms))/DAY)}d ago`
    })),
    ...quotes.filter(q=>q.status==="sent"&&(now_ms-(q.sentAt||now_ms))>7*DAY).map(q=>({
      q, type:"followup", icon:"📬", color:"#3B82F6",
      msg:`Sent ${Math.floor((now_ms-(q.sentAt||now_ms))/DAY)}d ago — no client response yet`
    })),
    ...quotes.filter(q=>q.status==="rejected").map(q=>({
      q, type:"rejected", icon:"❌", color:"#EF4444",
      msg:`Rejected by Studio Lead${q.rejectionNotes?" — "+q.rejectionNotes.slice(0,50):""}`
    })),
    ...quotes.filter(q=>q.status==="draft"&&(now_ms-(q.createdAt||now_ms))>14*DAY).map(q=>({
      q, type:"stale", icon:"🕐", color:C.text3,
      msg:`Draft stale — created ${Math.floor((now_ms-(q.createdAt||now_ms))/DAY)}d ago`
    })),
  ].slice(0,10)

  // Figures based on calcSnapshot stored on quote
  const fee  = q => q.calcSnapshot?.grand || 0
  const hrs  = q => q.calcSnapshot?.totalH || 0

  // Revenue KPIs (all time)
  const accepted  = quotes.filter(q=>q.status==="accepted")
  const sent      = quotes.filter(q=>["sent","accepted","declined"].includes(q.status))
  const inPipe    = quotes.filter(q=>["approved","sent"].includes(q.status))
  const active    = quotes.filter(q=>!["declined"].includes(q.status))

  const totalWon      = accepted.reduce((s,q)=>s+fee(q),0)
  const totalPipeline = inPipe.reduce((s,q)=>s+fee(q),0)
  const totalQuoted   = quotes.reduce((s,q)=>s+fee(q),0)
  const convRate      = sent.length>0?((accepted.length/sent.length)*100).toFixed(0):0

  const ngnFmt = n => "₦"+Math.round(n).toLocaleString("en-NG")

  // Revenue by month (last 6 months) — based on accepted quotes
  const now = Date.now()
  const monthRevData = []
  for(let i=5;i>=0;i--){
    const d = new Date(now); d.setMonth(d.getMonth()-i); d.setDate(1)
    const mStart = d.getTime()
    const mEnd   = new Date(d.getFullYear(),d.getMonth()+1,1).getTime()
    const label  = d.toLocaleDateString("en-GB",{month:"short",year:"2-digit"})
    const rev    = accepted.filter(q=>(q.clientResponseAt||0)>=mStart&&(q.clientResponseAt||0)<mEnd).reduce((s,q)=>s+fee(q),0)
    const quoted = quotes.filter(q=>(q.createdAt||0)>=mStart&&(q.createdAt||0)<mEnd).reduce((s,q)=>s+fee(q),0)
    monthRevData.push({label,won:Math.round(rev/1000000*10)/10,quoted:Math.round(quoted/1000000*10)/10})
  }

  // Pipeline counts per status
  const pipelineCols = [
    {key:"draft",          label:"Draft",            color:STATUS.draft.color},
    {key:"pending_approval",label:"Pending Review",  color:STATUS.pending_approval.color},
    {key:"approved",       label:"Approved",         color:STATUS.approved.color},
    {key:"sent",           label:"Sent to Client",   color:STATUS.sent.color},
    {key:"accepted",       label:"Accepted",         color:STATUS.accepted.color},
    {key:"rejected",       label:"Rejected",         color:STATUS.rejected.color},
    {key:"declined",       label:"Declined",         color:STATUS.declined.color},
  ]

  // Filter + sort
  const visible = quotes
    .filter(q=>{
      const matchSearch = !search || q.projectName?.toLowerCase().includes(search.toLowerCase()) ||
        q.client?.toLowerCase().includes(search.toLowerCase()) ||
        q.ref?.toLowerCase().includes(search.toLowerCase()) ||
        q.designerName?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusF==="all" || (statusF==="__specifier"?q.quoteType==="specifier":q.status===statusF)
      return matchSearch && matchStatus
    })
    .sort((a,b)=>{
      let va,vb
      if(sortBy==="fee")   {va=fee(a);vb=fee(b)}
      else if(sortBy==="name") {va=(a.projectName||"").toLowerCase();vb=(b.projectName||"").toLowerCase()}
      else if(sortBy==="status"){va=a.status;vb=b.status}
      else                {va=a.createdAt||0;vb=b.createdAt||0}
      if(va<vb) return sortDir==="asc"?-1:1
      if(va>vb) return sortDir==="asc"?1:-1
      return 0
    })

  const toggleSort = (col) => {
    if(sortBy===col) setSortDir(d=>d==="asc"?"desc":"asc")
    else { setSortBy(col); setSortDir("desc") }
  }
  const SortHd = ({col,label}) => (
    <th onClick={()=>toggleSort(col)}
      style={{padding:"9px 12px",fontSize:11,fontWeight:600,color:sortBy===col?AMBER:C.text3,
        textAlign:col==="fee"||col==="date"?"right":"left",cursor:"pointer",
        borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".05em",
        userSelect:"none",whiteSpace:"nowrap"}}>
      {label} {sortBy===col?(sortDir==="asc"?"↑":"↓"):""}
    </th>
  )

  return (
    <div>
      {/* ── Attention Required ── */}
      {attentionItems.length>0&&(
        <Card style={{marginBottom:20,border:`1px solid #F59E0B50`,background:"#FFFBEB"}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid #F59E0B30`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#92400E"}}>⚠ Attention Required — {attentionItems.length} item{attentionItems.length!==1?"s":""}</div>
          </div>
          {attentionItems.map((item,i)=>(
            <div key={item.q.id} onClick={()=>onOpenQuote(item.q)}
              style={{display:"flex",gap:12,padding:"10px 16px",borderBottom:i<attentionItems.length-1?`1px solid ${C.border2}`:"none",cursor:"pointer",alignItems:"flex-start"}}
              onMouseOver={e=>e.currentTarget.style.background="#FEF3C720"}
              onMouseOut={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.text}}>{item.q.projectName||"Untitled"}</span>
                  <span style={{fontSize:11,color:item.color,fontWeight:600,flexShrink:0}}>{item.q.ref}</span>
                </div>
                <div style={{fontSize:12,color:item.color,marginTop:2}}>{item.msg}</div>
              </div>
              <span style={{fontSize:12,color:AMBER,fontWeight:600,flexShrink:0}}>Open →</span>
            </div>
          ))}
        </Card>
      )}

      {quotes.filter(q=>q.quoteType==="specifier").length>0&&(
        <div style={{padding:"10px 16px",borderRadius:9,background:"#F5F3FF",border:"1px solid #8B5CF640",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>📐</span>
            <div>
              <span style={{fontSize:13,fontWeight:600,color:"#5B21B6"}}>Specifier Quotes: </span>
              <span style={{fontSize:13,color:"#7C3AED"}}>
                {quotes.filter(q=>q.quoteType==="specifier").length} quotes · {quotes.filter(q=>q.quoteType==="specifier").reduce((s,q)=>s+(q.calcSnapshot?.stageHrs?.s1||0),0).toFixed(1)} unbillable hrs · ₦{Math.round(quotes.filter(q=>q.quoteType==="specifier").reduce((s,q)=>s+(q.calcSnapshot?.subtotal||0),0)/1000).toLocaleString("en-NG")}k studio cost
              </span>
            </div>
          </div>
          <Btn onClick={()=>setStatusF(statusF==="__specifier"?"all":"__specifier")} variant="ghost" small
            style={{borderColor:"#8B5CF6",color:"#7C3AED",background:statusF==="__specifier"?"#8B5CF620":"transparent"}}>
            {statusF==="__specifier"?"Show All":"View Specifier Quotes"}
          </Btn>
        </div>
      )}

      {/* Revenue KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"Total Fees Won",    value:ngnFmt(totalWon),      sub:`${accepted.length} accepted project${accepted.length!==1?"s":""}`,   color:C.green},
          {label:"In Pipeline",       value:ngnFmt(totalPipeline),  sub:`${inPipe.length} approved or sent`,                                   color:AMBER},
          {label:"Total Fees Quoted", value:ngnFmt(totalQuoted),    sub:`${quotes.length} total quote${quotes.length!==1?"s":""}`,             color:C.blue},
          {label:"Conversion Rate",   value:convRate+"%",           sub:`${accepted.length} of ${sent.length} sent quotes`,                    color:C.purple},
        ].map(k=>(
          <Card key={k.label}><div style={{padding:"14px 16px"}}>
            <div style={{fontSize:20,fontWeight:700,color:k.color,marginBottom:3}}>{k.value}</div>
            <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:1}}>{k.label}</div>
            <div style={{fontSize:11,color:C.text3}}>{k.sub}</div>
          </div></Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card style={{marginBottom:20}}><div style={{padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <SectionTitle style={{margin:0}}>Revenue — Last 6 Months (₦M)</SectionTitle>
          <div style={{display:"flex",gap:12,fontSize:11,color:C.text3}}>
            <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:3,background:C.green,borderRadius:2,display:"inline-block"}}/>Won</span>
            <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:3,background:AMBER,borderRadius:2,display:"inline-block"}}/>Quoted</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthRevData} margin={{top:4,right:4,bottom:4,left:4}}>
            <XAxis dataKey="label" tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={(v)=>`₦${v}M`} contentStyle={{fontSize:12,borderRadius:8,border:`1px solid ${C.border}`}}/>
            <Bar dataKey="quoted" fill={`${AMBER}50`} name="Quoted" radius={[3,3,0,0]}/>
            <Bar dataKey="won"    fill={C.green}       name="Won"    radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div></Card>

      {/* Pipeline status counts */}
      <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
        {pipelineCols.map(col=>{
          const count = quotes.filter(q=>q.status===col.key).length
          const active = statusF===col.key
          return (
            <div key={col.key} onClick={()=>setStatusF(active?"all":col.key)}
              style={{flexShrink:0,padding:"10px 14px",borderRadius:9,border:`2px solid ${active?col.color:C.border}`,
                background:active?col.color+"15":C.bg,cursor:"pointer",textAlign:"center",minWidth:90,transition:"all .15s"}}>
              <div style={{fontSize:22,fontWeight:700,color:col.color}}>{count}</div>
              <div style={{fontSize:11,color:active?col.color:C.text3,fontWeight:active?600:400,marginTop:1}}>{col.label}</div>
            </div>
          )
        })}
        {statusF!=="all"&&(
          <div onClick={()=>setStatusF("all")}
            style={{flexShrink:0,padding:"10px 14px",borderRadius:9,border:`1px dashed ${C.border}`,background:"transparent",cursor:"pointer",textAlign:"center",minWidth:60,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:12,color:C.text3}}>Clear ✕</span>
          </div>
        )}
      </div>

      {/* View toggle + Search + controls */}
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:2,background:C.bg2,borderRadius:8,padding:2,border:`1px solid ${C.border}`,flexShrink:0}}>
          {[["table","≡ Table"],["kanban","⬛ Pipeline"]].map(([k,l])=>(
            <button key={k} onClick={()=>setView(k)}
              style={{padding:"5px 12px",borderRadius:6,border:"none",fontSize:12,cursor:"pointer",
                background:view===k?AMBER:"transparent",color:view===k?"#fff":C.text2,fontWeight:view===k?600:400,transition:"all .15s"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{flex:1,minWidth:220,position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.text3,fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search project, client, ref, designer..."
            style={{...inp({paddingLeft:32,fontSize:13})}}/>
        </div>
        <span style={{fontSize:12,color:C.text3}}>{visible.length} of {quotes.length} project{quotes.length!==1?"s":""}</span>
      </div>

      {/* Kanban Pipeline View */}
      {view==="kanban"&&(
        <div style={{overflowX:"auto",paddingBottom:8}}>
          <div style={{display:"flex",gap:12,minWidth:900}}>
            {[
              {key:"draft",          label:"Draft",          color:STATUS.draft.color},
              {key:"pending_approval",label:"Pending Review",color:STATUS.pending_approval.color},
              {key:"approved",       label:"Approved",       color:STATUS.approved.color},
              {key:"sent",           label:"Sent",           color:STATUS.sent.color},
              {key:"accepted",       label:"Accepted",       color:STATUS.accepted.color},
              {key:"declined",       label:"Declined",       color:STATUS.declined.color},
              {key:"rejected",       label:"Rejected",       color:STATUS.rejected.color},
            ].map(col=>{
              const colQuotes = visible.filter(q=>q.status===col.key)
              const colTotal  = colQuotes.reduce((s,q)=>s+(q.calcSnapshot?.grand||0),0)
              return(
                <div key={col.key} style={{flex:"0 0 220px",display:"flex",flexDirection:"column",gap:0}}>
                  <div style={{padding:"8px 12px",borderRadius:"8px 8px 0 0",background:col.color+"20",border:`1px solid ${col.color}40`,borderBottom:"none"}}>
                    <div style={{fontSize:12,fontWeight:700,color:col.color,textTransform:"uppercase",letterSpacing:".05em"}}>{col.label}</div>
                    <div style={{fontSize:11,color:C.text3,marginTop:2}}>{colQuotes.length} · {ngnFmt(colTotal)}</div>
                  </div>
                  <div style={{flex:1,border:`1px solid ${col.color}30`,borderTop:"none",borderRadius:"0 0 8px 8px",minHeight:200,padding:6,display:"flex",flexDirection:"column",gap:6,background:C.bg}}>
                    {colQuotes.length===0&&<div style={{fontSize:12,color:C.text3,textAlign:"center",padding:"20px 0"}}>—</div>}
                    {colQuotes.map(q=>(
                      <div key={q.id} onClick={()=>onOpenQuote(q)}
                        style={{padding:"10px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.bg2,cursor:"pointer",transition:"all .12s"}}
                        onMouseOver={e=>e.currentTarget.style.borderColor=col.color}
                        onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
                        <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{q.projectName||"Untitled"}</div>
                        <div style={{fontSize:11,color:C.text3,marginBottom:4}}>{q.ref}</div>
                        {q.calcSnapshot?.grand>0&&<div style={{fontSize:12,fontWeight:600,color:col.key==="accepted"?C.green:AMBER}}>{ngnFmt(q.calcSnapshot.grand)}</div>}
                        {q.quoteType==="specifier"&&<div style={{fontSize:10,color:"#7C3AED",fontWeight:600,marginTop:3}}>📐 Specifier</div>}
                        <div style={{fontSize:10,color:C.text3,marginTop:4}}>{q.designerName?.split(" ")[0]||"—"} · {q.createdAt?new Date(q.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}):""}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Projects table — shown in table view only */}
      {view==="table"&&visible.length===0&&(
        <Card><div style={{padding:32,textAlign:"center",color:C.text3,fontSize:14}}>
          {quotes.length===0?"No projects yet. Create your first quote to get started.":"No projects match your filters."}
        </div></Card>
      )}
      {view==="table"&&visible.length>0&&(
        <Card style={{overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:740}}>
              <thead>
                <tr style={{background:C.bg2}}>
                  <SortHd col="name"   label="Project"/>
                  <th style={{padding:"9px 12px",fontSize:11,fontWeight:600,color:C.text3,textAlign:"left",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".05em"}}>Client</th>
                  <th style={{padding:"9px 12px",fontSize:11,fontWeight:600,color:C.text3,textAlign:"left",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".05em"}}>Designer</th>
                  <SortHd col="status" label="Status"/>
                  <th style={{padding:"9px 12px",fontSize:11,fontWeight:600,color:C.text3,textAlign:"center",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".05em"}}>Rooms</th>
                  <th style={{padding:"9px 12px",fontSize:11,fontWeight:600,color:C.text3,textAlign:"center",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".05em"}}>Hrs</th>
                  <SortHd col="fee"    label="Fee (excl. VAT)"/>
                  <SortHd col="date"   label="Date"/>
                  <th style={{padding:"9px 12px",fontSize:11,fontWeight:600,color:C.text3,borderBottom:`1px solid ${C.border}`}}/>
                </tr>
              </thead>
              <tbody>
                {visible.map((q,i)=>{
                  const s    = STATUS[q.status]||STATUS.draft
                  const snap = q.calcSnapshot||{}
                  const rooms= (q.rooms||[]).filter(r=>r.locType).length
                  return (
                    <tr key={q.id} style={{borderTop:`1px solid ${C.border2}`,background:i%2===0?"transparent":C.bg2,cursor:"pointer"}}
                      onClick={()=>onOpenQuote(q)}
                      onMouseOver={e=>e.currentTarget.style.background=`${AMBER}08`}
                      onMouseOut={e=>e.currentTarget.style.background=i%2===0?"transparent":C.bg2}>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text}}>{q.projectName||"Untitled"}</div>
                        <div style={{fontSize:11,color:C.text3,marginTop:1}}>{q.ref} · v{q.version||1}</div>
                      </td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{fontSize:12,color:C.text}}>{q.proj?.client||q.client||"—"}</div>
                        {q.proj?.address&&<div style={{fontSize:11,color:C.text3,marginTop:1}}>{q.proj.address.split(",")[0]}</div>}
                      </td>
                      <td style={{padding:"10px 12px",fontSize:12,color:C.text2}}>{q.designerName||"—"}</td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:10,background:s.color+"20",color:s.color,border:`1px solid ${s.color}40`,whiteSpace:"nowrap"}}>{s.label}</span>
                          {q.quoteType==="specifier"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:8,background:"#8B5CF620",color:"#7C3AED",border:"1px solid #8B5CF640",whiteSpace:"nowrap"}}>📐 Specifier</span>}
                        </div>
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"center",fontSize:12,color:C.text}}>{rooms}</td>
                      <td style={{padding:"10px 12px",textAlign:"center",fontSize:12,color:C.text}}>{snap.totalH?snap.totalH.toFixed(1):"—"}</td>
                      <td style={{padding:"10px 12px",textAlign:"right"}}>
                        <div style={{fontSize:13,fontWeight:600,color:q.status==="accepted"?C.green:C.text}}>
                          {snap.subtotal?ngnFmt(snap.subtotal):"—"}
                        </div>
                        {snap.grand&&snap.grand!==snap.subtotal&&<div style={{fontSize:11,color:AMBER}}>{ngnFmt(snap.grand)} inc VAT</div>}
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"right",fontSize:11,color:C.text3,whiteSpace:"nowrap"}}>
                        {q.createdAt?new Date(q.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"}):"—"}
                      </td>
                      <td style={{padding:"10px 8px",textAlign:"center"}}>
                        <span style={{fontSize:11,color:AMBER,fontWeight:600}}>Open →</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {visible.length>0&&(
                <tfoot>
                  <tr style={{borderTop:`2px solid ${C.border}`,background:C.bg2}}>
                    <td colSpan={6} style={{padding:"10px 12px",fontSize:12,fontWeight:600,color:C.text3}}>{visible.length} project{visible.length!==1?"s":""}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:13,fontWeight:700,color:C.text}}>
                      {ngnFmt(visible.reduce((s,q)=>s+(q.calcSnapshot?.subtotal||0),0))}
                    </td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// PERFORMANCE DASHBOARD — studio metrics (existing, renamed)
// ────────────────────────────────────────────────────────────────
function PerformanceDashboard({session, quotes}) {
  const [period,setPeriod]=useState("month")
  const [designerFilter,setDesignerFilter]=useState("all")

  const now = Date.now()
  const periods = {week:7*86400000,month:30*86400000,quarter:91*86400000,year:365*86400000}
  const cutoff = now - periods[period]

  const filtered = quotes.filter(q => (q.createdAt||0) >= cutoff && (designerFilter==="all"||q.designerId===designerFilter))
  const designers = [...new Map(quotes.map(q=>[q.designerId,{id:q.designerId,name:q.designerName}])).values()]

  // KPIs
  const submitted = filtered.filter(q=>q.submittedAt)
  const avgGenHrs = submitted.length>0 ? (submitted.reduce((s,q)=>s+((q.submittedAt-q.createdAt)/3600000),0)/submitted.length).toFixed(1) : "—"

  const approved = filtered.filter(q=>q.approvedAt&&q.submittedAt)
  const avgApprovalHrs = approved.length>0 ? (approved.reduce((s,q)=>s+((q.approvedAt-q.submittedAt)/3600000),0)/approved.length).toFixed(1) : "—"

  const decidedQuotes = filtered.filter(q=>q.status==="approved"||q.status==="rejected"||q.status==="sent"||q.status==="accepted"||q.status==="declined")
  const rejectedQuotes = filtered.filter(q=>q.status==="rejected")
  const rejectionRate = decidedQuotes.length>0 ? ((rejectedQuotes.length/decidedQuotes.length)*100).toFixed(0)+"%" : "—"

  const sentQuotes = filtered.filter(q=>q.status==="sent"||q.status==="accepted"||q.status==="declined")
  const acceptedQuotes = filtered.filter(q=>q.status==="accepted")
  const conversionRate = sentQuotes.length>0 ? ((acceptedQuotes.length/sentQuotes.length)*100).toFixed(0)+"%" : "—"

  const discountedQuotes = filtered.filter(q=>q.cfg?.discount>0)
  const avgDiscount = discountedQuotes.length>0 ? (discountedQuotes.reduce((s,q)=>s+(q.cfg.discount||0),0)/discountedQuotes.length).toFixed(1)+"%" : "0%"

  // Charts
  const statusData = Object.entries(STATUS).map(([k,v])=>({name:v.label.replace(" Approval","").replace(" to Client",""),value:filtered.filter(q=>q.status===k).length,color:v.color})).filter(d=>d.value>0)

  const designerData = designers.map(d=>{
    const dq = filtered.filter(q=>q.designerId===d.id)
    return {name:d.name.split(" ")[0],total:dq.length,approved:dq.filter(q=>["approved","sent","accepted"].includes(q.status)).length,rejected:dq.filter(q=>q.status==="rejected").length}
  })

  // Timeline: quotes per week
  const timelineData = []
  for(let i=6;i>=0;i--){
    const weekStart = now-((i+1)*7*86400000)
    const weekEnd = now-(i*7*86400000)
    const label = new Date(weekEnd).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})
    timelineData.push({label,count:quotes.filter(q=>(q.createdAt||0)>=weekStart&&(q.createdAt||0)<weekEnd).length})
  }

  const allSpecifier   = quotes.filter(q=>q.quoteType==="specifier")
  // Specifier unbillable = Stage 1 hours only (calc runs all stages but only S1 is delivered)
  const specifierHrs   = allSpecifier.reduce((s,q)=>s+(q.calcSnapshot?.stageHrs?.s1||0),0)
  const billableHrs    = quotes.filter(q=>q.quoteType!=="specifier").reduce((s,q)=>s+(q.calcSnapshot?.totalH||0),0)
  const totalAllHrs    = specifierHrs+billableHrs
  const unbillableRatio= totalAllHrs>0?((specifierHrs/totalAllHrs)*100).toFixed(0)+"%":"0%"
  const unbillableCost = allSpecifier.reduce((s,q)=>s+(q.calcSnapshot?.subtotal||0),0)

  const kpis = [
    {label:"Avg Quote Generation Time",value:avgGenHrs,unit:avgGenHrs!=="—"?"hrs":"",icon:"⏱",color:C.blue},
    {label:"Avg Approval Turnaround",value:avgApprovalHrs,unit:avgApprovalHrs!=="—"?"hrs":"",icon:"✅",color:C.green},
    {label:"Approval Rejection Rate",value:rejectionRate,unit:"",icon:"⚠",color:C.red},
    {label:"Quote Conversion Rate",value:conversionRate,unit:"",icon:"🎯",color:C.purple},
    {label:"Specifier Unbillable Ratio",value:unbillableRatio,unit:"",icon:"📐",color:"#7C3AED",sub:`${specifierHrs.toFixed(1)} hrs · ₦${Math.round(unbillableCost/1000).toLocaleString("en-NG")}k cost`},
    {label:"Total Quotes",value:filtered.length,unit:"",icon:"📋",color:C.text},
  ]

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div><h2 style={{margin:0,fontSize:22,fontWeight:700,color:C.text}}>Studio Performance</h2><p style={{margin:"4px 0 0",fontSize:14,color:C.text2}}>Studio-wide design performance metrics</p></div>
        <div style={{display:"flex",gap:8}}>
          {session.role==="lead"&&(
            <select value={designerFilter} onChange={e=>setDesignerFilter(e.target.value)} style={{...inp(),width:"auto",fontSize:12}}>
              <option value="all">All Designers</option>
              {designers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <div style={{display:"flex",gap:3,background:C.bg2,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>
            {[["week","Week"],["month","Month"],["quarter","Quarter"],["year","Year"]].map(([k,l])=>(
              <button key={k} onClick={()=>setPeriod(k)} style={{padding:"5px 12px",borderRadius:6,border:"none",fontSize:12,cursor:"pointer",background:period===k?AMBER:"transparent",color:period===k?"#fff":C.text2,fontWeight:period===k?600:400}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
        {kpis.map(k=>(
          <Card key={k.label}><div style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{fontSize:22,marginBottom:4}}>{k.icon}</div>
              <div style={{fontSize:22,fontWeight:700,color:k.color}}>{k.value}{k.unit&&<span style={{fontSize:14,fontWeight:500,color:C.text3,marginLeft:2}}>{k.unit}</span>}</div>
            </div>
            <div style={{fontSize:12,color:C.text3,fontWeight:500,marginBottom:k.sub?2:0}}>{k.label}</div>
            {k.sub&&<div style={{fontSize:11,color:C.text3}}>{k.sub}</div>}
          </div></Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        {/* Quote volume by designer */}
        <Card><div style={{padding:16}}>
          <SectionTitle>Quotes by Designer</SectionTitle>
          {designerData.length===0?<div style={{textAlign:"center",padding:24,color:C.text3,fontSize:13}}>No data for this period</div>:(
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={designerData} margin={{top:4,right:4,bottom:4,left:4}}>
                <XAxis dataKey="name" tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:`1px solid ${C.border}`}}/>
                <Bar dataKey="total" fill={AMBER} name="Total" radius={[4,4,0,0]}/>
                <Bar dataKey="approved" fill={C.green} name="Approved" radius={[4,4,0,0]}/>
                <Bar dataKey="rejected" fill={C.red} name="Rejected" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div></Card>

        {/* Status breakdown */}
        <Card><div style={{padding:16}}>
          <SectionTitle>Status Breakdown</SectionTitle>
          {statusData.length===0?<div style={{textAlign:"center",padding:24,color:C.text3,fontSize:13}}>No quotes for this period</div>:(
            <div>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" nameKey="name">
                    {statusData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:`1px solid ${C.border}`}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
                {statusData.map(d=>(
                  <span key={d.name} style={{fontSize:11,display:"flex",alignItems:"center",gap:4}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:d.color,display:"inline-block"}}/>
                    {d.name}: <strong>{d.value}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div></Card>
      </div>

      {/* Timeline */}
      <Card style={{marginBottom:20}}><div style={{padding:16}}>
        <SectionTitle>Quote Volume — Last 7 Weeks</SectionTitle>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={timelineData} margin={{top:4,right:4,bottom:4,left:4}}>
            <XAxis dataKey="label" tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:11,fill:C.text3}} axisLine={false} tickLine={false} allowDecimals={false}/>
            <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:`1px solid ${C.border}`}}/>
            <Line type="monotone" dataKey="count" stroke={AMBER} strokeWidth={2} dot={{fill:AMBER,r:4}} name="Quotes"/>
          </LineChart>
        </ResponsiveContainer>
      </div></Card>

      {/* Per-designer table */}
      {session.role==="lead"&&(
        <Card><div style={{padding:16}}>
          <SectionTitle>Designer Performance — {period.charAt(0).toUpperCase()+period.slice(1)}</SectionTitle>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:C.bg2}}>
                {["Designer","Quotes Created","Submitted","Approved","Rejected","Rejection %","Converted","Avg Gen Time"].map(h=>(
                  <th key={h} style={{padding:"8px 12px",fontSize:11,fontWeight:600,color:C.text3,textAlign:h==="Designer"?"left":"right",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {designers.map(d=>{
                const dq=filtered.filter(q=>q.designerId===d.id)
                const dsub=dq.filter(q=>q.submittedAt)
                const dapr=dq.filter(q=>["approved","sent","accepted"].includes(q.status))
                const drej=dq.filter(q=>q.status==="rejected")
                const ddec=dq.filter(q=>["approved","rejected","sent","accepted","declined"].includes(q.status))
                const dconv=dq.filter(q=>q.status==="accepted")
                const dsent=dq.filter(q=>["sent","accepted","declined"].includes(q.status))
                const avgG=dsub.length>0?(dsub.reduce((s,q)=>s+((q.submittedAt-q.createdAt)/3600000),0)/dsub.length).toFixed(1)+"h":"—"
                return(
                  <tr key={d.id} style={{borderTop:`1px solid ${C.border2}`}}>
                    <td style={{padding:"10px 12px",fontSize:13,fontWeight:500,color:C.text}}>{d.name}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:C.text}}>{dq.length}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:C.text}}>{dsub.length}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:C.green,fontWeight:500}}>{dapr.length}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:C.red,fontWeight:500}}>{drej.length}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:ddec.length>0&&(drej.length/ddec.length)>.2?C.red:C.text}}>{ddec.length>0?((drej.length/ddec.length)*100).toFixed(0)+"%":"—"}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:C.purple,fontWeight:500}}>{dsent.length>0?((dconv.length/dsent.length)*100).toFixed(0)+"%":"—"}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:C.text}}>{avgG}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div></Card>
      )}

      {/* Specifier Conversion Funnel */}
      {(() => {
        const allSpec = quotes.filter(q=>q.quoteType==="specifier")
        if(allSpec.length===0) return null
        // A specifier converts if the same client (matched by arch/mep email or project name) 
        // has a subsequent residential quote
        const converted = allSpec.filter(q=>!!q.convertedToId)
        const specHrsCost = allSpec.reduce((s,q)=>s+(q.calcSnapshot?.subtotal||0),0)
        const convRevenue = converted.reduce((s,q)=>{
          const resQ=quotes.find(r=>r.id===q.convertedToId)
          return s+(resQ?.calcSnapshot?.grand||0)
        },0)
        const rate = allSpec.length>0?((converted.length/allSpec.length)*100).toFixed(0):0
        const funnel = [
          {label:"Specifier Engagements", value:allSpec.length, color:"#7C3AED", pct:100},
          {label:"Resulted in Follow-on Residential Quote", value:converted.length, color:"#3B82F6", pct:allSpec.length>0?Math.round(converted.length/allSpec.length*100):0},
        ]
        return (
          <Card style={{marginTop:20}}><div style={{padding:16}}>
            <SectionTitle>Specifier Conversion Funnel</SectionTitle>
            <p style={{fontSize:12,color:C.text2,margin:"0 0 16px"}}>Tracks which specifier (architect/MEP) engagements led to a paid residential design engagement.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
              {[
                {label:"Specifier Quotes",  value:allSpec.length,    sub:"Total complimentary S1 engagements",     color:"#7C3AED"},
                {label:"Conversions",       value:converted.length,  sub:"Led to a residential quote",              color:"#16A34A"},
                {label:"Conversion Rate",   value:rate+"%",          sub:`Studio cost: ₦${Math.round(specHrsCost/1000).toLocaleString("en-NG")}k`, color:parseInt(rate)>=20?C.green:parseInt(rate)>=10?AMBER:C.red},
              ].map(k=>(
                <div key={k.label} style={{padding:"14px 16px",borderRadius:10,border:`1px solid ${k.color}30`,background:k.color+"08"}}>
                  <div style={{fontSize:22,fontWeight:700,color:k.color,marginBottom:2}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:2}}>{k.label}</div>
                  <div style={{fontSize:11,color:C.text3}}>{k.sub}</div>
                </div>
              ))}
            </div>
            {funnel.map((f,i)=>(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:C.text}}>{f.label}</span>
                  <span style={{fontSize:12,fontWeight:700,color:f.color}}>{f.value} ({f.pct}%)</span>
                </div>
                <div style={{height:10,borderRadius:5,background:C.border2,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:5,background:f.color,width:`${f.pct}%`,transition:"width .4s ease"}}/>
                </div>
              </div>
            ))}
            {allSpec.length>0&&(
              <div style={{marginTop:16}}>
                <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:8}}>Specifier Breakdown by Firm</div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr style={{background:C.bg2}}>
                    {["Firm","Type","Quotes","Status","Converted?"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",fontSize:11,fontWeight:600,color:C.text3,textAlign:"left",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {allSpec.map(q=>{
                      const isConv = converted.some(c=>c.id===q.id)
                      return(
                        <tr key={q.id} style={{borderTop:`1px solid ${C.border2}`}}>
                          <td style={{padding:"8px 10px",fontSize:12,fontWeight:500,color:C.text}}>{q.proj?.archCompany||q.proj?.mepCompany||"—"}</td>
                          <td style={{padding:"8px 10px",fontSize:12,color:C.text2}}>{q.proj?.archCompany?"Architect":"MEP"}</td>
                          <td style={{padding:"8px 10px",fontSize:12,color:C.text}}>{q.ref}</td>
                          <td style={{padding:"8px 10px"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:8,background:STATUS[q.status]?.color+"20",color:STATUS[q.status]?.color,fontWeight:600}}>{STATUS[q.status]?.label||q.status}</span></td>
                          <td style={{padding:"8px 10px"}}>
                            {isConv?(()=>{
                              const resQ=quotes.find(r=>r.id===q.convertedToId)
                              return <div>
                                <span style={{fontSize:12,fontWeight:700,color:C.green}}>✓ Yes</span>
                                {resQ&&<div style={{fontSize:10,color:C.text3,marginTop:2}}>{resQ.projectName} · {resQ.ref}</div>}
                              </div>
                            })():<span style={{fontSize:12,color:C.text3}}>—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div></Card>
        )
      })()}
    </div>
  )
}

// ── Admin Panel ────────────────────────────────────────────
function AdminPanel({session, onSettingsChange}) {
  const [tab,setTab]=useState("users")
  const [users,setUsers]=useState([])
  const [settings,setSettings]=useState(null)
  const [newUser,setNewUser]=useState({name:"",email:"",role:"designer",password:""})
  const [pwdPrompt,setPwdPrompt]=useState(true)
  const [adminPwd,setAdminPwd]=useState("")
  const [pwdErr,setPwdErr]=useState("")
  const [saving,setSaving]=useState(false)
  const [msg,setMsg]=useState("")
  const [newAdminPwd,setNewAdminPwd]=useState("")
  const [confirmAdminPwd,setConfirmAdminPwd]=useState("")
  const [pwdChangeMsg,setPwdChangeMsg]=useState("")
  const [customTpls,setCustomTpls]=useState([])
  const [crmSpecs,setCrmSpecs]=useState([])
  const [rejNotes,setRejNotes]=useState({})
  const [specMsg,setSpecMsg]=useState("")
  const [resetingId,setResetingId]=useState(null)
  const [resetPwdVal,setResetPwdVal]=useState("")
  const [resetPwdConfirm,setResetPwdConfirm]=useState("")
  const [resetPwdErr,setResetPwdErr]=useState("")
  const [rc,setRc]=useState("")
  const [rcConfirm,setRcConfirm]=useState("")
  const [rcMsg,setRcMsg]=useState("")

  useEffect(()=>{
    Promise.all([store.getUsers(),store.getSettings(),store.get("ced_templates")||Promise.resolve([]),store.getSpecifiers()]).then(([u,s,t,sp])=>{setUsers(u);setSettings(s);setCustomTpls(t||[]);setCrmSpecs(sp||[])})
  },[])

  const checkAdminPwd = async () => {
    const s = await store.getSettings()
    if (hp(adminPwd)===(s.adminPwd||hp("ADMIN@CED"))) { setPwdPrompt(false);setPwdErr("") }
    else setPwdErr("Incorrect admin password.")
  }

  const saveSettings = async (updated) => {
    setSaving(true)
    await store.saveSettings(updated)
    setSettings(updated)
    onSettingsChange(updated)
    setMsg("Settings saved.")
    setTimeout(()=>setMsg(""),2000)
    setSaving(false)
  }

  const createUser = async () => {
    if(!newUser.name||!newUser.email||!newUser.password){setMsg("All fields required.");return}
    const existing = users.find(u=>u.email.toLowerCase()===newUser.email.toLowerCase())
    if(existing){setMsg("Email already in use.");return}
    const user = {id:uid(),name:newUser.name,email:newUser.email,role:newUser.role,password:hp(newUser.password),active:true,createdAt:Date.now(),createdBy:session.userId}
    const updated = [...users,user]
    await store.saveUsers(updated)
    setUsers(updated)
    setNewUser({name:"",email:"",role:"designer",password:""})
    setMsg("Account created.")
    setTimeout(()=>setMsg(""),2000)
  }

  const toggleUser = async (id) => {
    const updated = users.map(u=>u.id===id?{...u,active:!u.active}:u)
    await store.saveUsers(updated)
    setUsers(updated)
  }

  const resetPwd = async (id,newPwd) => {
    const updated = users.map(u=>u.id===id?{...u,password:hp(newPwd)}:u)
    await store.saveUsers(updated)
    setUsers(updated)
    setMsg("Password reset.")
    setTimeout(()=>setMsg(""),2000)
  }

  if (pwdPrompt) return (
    <div style={{maxWidth:420,margin:"60px auto"}}>
      <Card style={{padding:28}}>
        <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>⚙ Admin Panel — Restricted Access</div>
        <div style={{fontSize:13,color:C.text2,marginBottom:18}}>Enter the super admin password to access studio settings.</div>
        {pwdErr&&<div style={{padding:"8px 12px",borderRadius:7,background:"#fef2f2",color:C.red,fontSize:13,marginBottom:12}}>{pwdErr}</div>}
        <IL label="Admin Password">
          <TI value={adminPwd} onChange={setAdminPwd} placeholder="••••••••" type="password" style={{letterSpacing:"0.1em"}}/>
        </IL>
        <Btn onClick={checkAdminPwd} style={{width:"100%"}}>Unlock Admin Panel</Btn>
        <div style={{marginTop:10,fontSize:11,color:C.text3,textAlign:"center"}}>Default password: ADMIN@CED (change on first access)</div>
      </Card>
    </div>
  )

  if (!settings) return <div style={{textAlign:"center",padding:40,color:C.text3}}>Loading...</div>

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div><h2 style={{margin:0,fontSize:22,fontWeight:700,color:C.text}}>Admin Panel</h2><p style={{margin:"4px 0 0",fontSize:14,color:C.text2}}>Studio Lead access only</p></div>
        {msg&&<div style={{padding:"8px 16px",borderRadius:8,background:`${C.green}15`,border:`1px solid ${C.green}30`,color:C.green,fontSize:13,fontWeight:500}}>{msg}</div>}
      </div>

      <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:`1px solid ${C.border}`}}>
        {[["users","User Accounts"],["rates","Sub-System Rates"],["sizes","Room Sizes"],["s4","Stage 4 Retainer"],["usd","USD Rate"],["specifiers","Specifiers CRM"],["templates","Templates"],["security","Security"],["tc","T&C Exclusions"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:"8px 16px",border:"none",borderBottom:tab===k?`2px solid ${AMBER}`:"2px solid transparent",background:"transparent",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?AMBER:C.text2,cursor:"pointer",marginBottom:-1,display:"flex",alignItems:"center",gap:5}}>
            {l}
            {k==="specifiers"&&crmSpecs.filter(s=>s.status==="pending").length>0&&(
              <span style={{padding:"1px 6px",borderRadius:8,background:"#DC2626",color:"#fff",fontSize:10,fontWeight:700,lineHeight:1.4}}>
                {crmSpecs.filter(s=>s.status==="pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab==="users"&&(
        <div>
          <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:600,color:C.text}}>Designer Accounts</h3>
          <Card style={{marginBottom:20}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:C.bg2}}>
                  {["Name","Email","Role","Status","Actions"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:600,color:C.text3,textAlign:"left",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u,i)=>(
                  <tr key={u.id} style={{borderTop:i>0?`1px solid ${C.border2}`:"none"}}>
                    <td style={{padding:"12px 14px",fontSize:13,fontWeight:500,color:C.text}}>{u.name}</td>
                    <td style={{padding:"12px 14px",fontSize:13,color:C.text2}}>{u.email}</td>
                    <td style={{padding:"12px 14px",fontSize:12}}><span style={{padding:"3px 9px",borderRadius:12,fontSize:11,fontWeight:600,background:u.role==="lead"?`${AMBER}15`:`${C.blue}15`,color:u.role==="lead"?AMBER:C.blue}}>{u.role==="lead"?"Studio Lead":"AV Designer"}</span></td>
                    <td style={{padding:"12px 14px",fontSize:12}}><span style={{color:u.active?C.green:C.red,fontWeight:500}}>{u.active?"Active":"Deactivated"}</span></td>
                    <td style={{padding:"12px 14px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <Btn onClick={()=>toggleUser(u.id)} variant={u.active?"ghost":"success"} small disabled={u.id===session.userId}>{u.active?"Deactivate":"Activate"}</Btn>
                        {u.id!==session.userId&&(
                          resetingId===u.id ? (
                            <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:220}}>
                              <input value={resetPwdVal} onChange={e=>setResetPwdVal(e.target.value)}
                                type="password" placeholder="New password (min 6 chars)"
                                style={{...inp({fontSize:12,padding:"5px 8px"})}}
                                autoFocus/>
                              <input value={resetPwdConfirm} onChange={e=>setResetPwdConfirm(e.target.value)}
                                type="password" placeholder="Confirm new password"
                                style={{...inp({fontSize:12,padding:"5px 8px"})}}/>
                              {resetPwdErr&&<div style={{fontSize:11,color:C.red}}>{resetPwdErr}</div>}
                              <div style={{display:"flex",gap:4}}>
                                <Btn onClick={async()=>{
                                  if(!resetPwdVal||resetPwdVal.length<6){setResetPwdErr("Min. 6 characters required.");return}
                                  if(resetPwdVal!==resetPwdConfirm){setResetPwdErr("Passwords do not match.");return}
                                  await resetPwd(u.id,resetPwdVal)
                                  setResetingId(null);setResetPwdVal("");setResetPwdConfirm("");setResetPwdErr("")
                                }} small>Save</Btn>
                                <Btn onClick={()=>{setResetingId(null);setResetPwdVal("");setResetPwdConfirm("");setResetPwdErr("")}} variant="ghost" small>Cancel</Btn>
                              </div>
                            </div>
                          ) : (
                            <Btn onClick={()=>{setResetingId(u.id);setResetPwdErr("")}} variant="ghost" small>Reset Password</Btn>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card style={{padding:20}}>
            <h4 style={{margin:"0 0 14px",fontSize:14,fontWeight:600,color:C.text}}>Create New Account</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <IL label="Full Name"><TI value={newUser.name} onChange={v=>setNewUser(n=>({...n,name:v}))} placeholder="e.g. Adebayo Okonkwo"/></IL>
              <IL label="Email Address"><TI value={newUser.email} onChange={v=>setNewUser(n=>({...n,email:v}))} placeholder="designer@cedafrica.com" type="email"/></IL>
              <IL label="Role">
                <Sel value={newUser.role} onChange={v=>setNewUser(n=>({...n,role:v}))} options={[{value:"designer",label:"AV Designer"},{value:"lead",label:"Studio Lead"}]}/>
              </IL>
              <IL label="Initial Password"><TI value={newUser.password} onChange={v=>setNewUser(n=>({...n,password:v}))} placeholder="Temporary password" type="password"/></IL>
            </div>
            <Btn onClick={createUser}>Create Account</Btn>
          </Card>
        </div>
      )}

      {tab==="rates"&&(
        <div>
          <p style={{margin:"0 0 14px",fontSize:13,color:C.text2,lineHeight:1.5}}>Hours per active sub-system per location per stage. Source: CED Design Man Hours spreadsheet. Amber = changed from defaults.</p>
          <Card>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:C.bg2}}>
                  <th style={{padding:"10px 14px",fontSize:11,fontWeight:600,color:C.text3,textAlign:"left",borderBottom:`2px solid ${C.border}`,minWidth:220}}>Sub-System</th>
                  {["Stage 1","Stage 2","Stage 3"].map((h,i)=>(
                    <th key={h} style={{padding:"10px 12px",fontSize:11,fontWeight:600,color:C.text3,textAlign:"center",borderBottom:`2px solid ${C.border}`,minWidth:100}}>{h}<div style={{fontSize:10,color:C.text3,fontWeight:400}}>hrs/location</div></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["Security","Comfort","AV","Infra"].map(cat=>(
                  <>
                    <tr key={`cat-${cat}`}>
                      <td colSpan={4} style={{padding:"6px 14px",background:C.bg3,fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".07em",borderTop:`1px solid ${C.border}`}}>
                        {cat==="Security"?"Security, Safety & Communication":cat==="Comfort"?"Comfort & Convenience":cat==="AV"?"Entertainment & AV":"Infrastructure"}
                      </td>
                    </tr>
                    {SYSTEMS.filter(s=>s.cat===cat).map((sys,ri)=>(
                      <tr key={sys.id} style={{borderTop:`1px solid ${C.border2}`,background:ri%2===0?"transparent":C.bg2}}>
                        <td style={{padding:"8px 14px",fontSize:13,color:C.text}}>{sys.label}</td>
                        {["s1","s2","s3"].map(stage=>{
                          const cur = settings.rates?.[stage]?.[sys.id]??DEF_RATES[stage]?.[sys.id]??0
                          const isChg = settings.rates?.[stage]?.[sys.id]!==undefined&&settings.rates[stage][sys.id]!==DEF_RATES[stage]?.[sys.id]
                          return(
                            <td key={stage} style={{padding:"5px 8px",textAlign:"center"}}>
                              <input type="number" step="0.05" min={0} max={5} value={cur}
                                onChange={e=>{
                                  const updated={...settings,rates:{...settings.rates,[stage]:{...(settings.rates[stage]||{}),[sys.id]:parseFloat(e.target.value)||0}}}
                                  setSettings(updated)
                                }}
                                style={{width:70,padding:"5px 8px",borderRadius:6,fontSize:12,textAlign:"center",boxSizing:"border-box",border:`1px solid ${isChg?AMBER:C.border}`,background:isChg?`${AMBER}10`:C.bg,color:C.text,outline:"none",fontFamily:"inherit"}}/>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr style={{borderTop:`2px solid ${C.border}`,background:C.bg2}}>
                  <td style={{padding:"9px 14px",fontSize:12,fontWeight:600,color:C.text2}}>Total (all systems active)</td>
                  {["s1","s2","s3"].map(st=>(
                    <td key={st} style={{padding:"9px 12px",textAlign:"center",fontSize:13,fontWeight:700,color:AMBER}}>
                      {SYSTEMS.reduce((s,sys)=>{const r=settings.rates?.[st]?.[sys.id]??DEF_RATES[st]?.[sys.id]??0;return s+r},0).toFixed(2)} h
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </Card>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={()=>saveSettings(settings)} disabled={saving}>{saving?"Saving...":"Save Rates"}</Btn>
            <Btn onClick={()=>{const s={...settings,rates:{}};setSettings(s);saveSettings(s)}} variant="ghost">Reset to Defaults</Btn>
          </div>

          {/* Home Cinema Base Hours */}
          <div style={{marginTop:24}}>
            <h4 style={{fontSize:13,fontWeight:700,color:"#7C3AED",margin:"0 0 4px"}}>🎬 Home Cinema — Base Design Hours</h4>
            <p style={{fontSize:12,color:C.text2,margin:"0 0 12px",lineHeight:1.5}}>
              Base hours per cinema room before size multiplier is applied. S1 also adds render hours (S+4h / M+6h / L+8h) per room when 3D Render is included.
            </p>
            <Card style={{padding:16}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {[["s1","Stage 1 — Concept Design","8"],["s2","Stage 2 — Site Pack","12"],["s3","Stage 3 — Engineering Pack","9"]].map(([st,label,def])=>{
                  const cur = settings.cinemaHrs?.[st]??parseFloat(def)
                  const isChg = settings.cinemaHrs?.[st]!==undefined && settings.cinemaHrs[st]!==parseFloat(def)
                  return(
                    <div key={st} style={{padding:"12px 14px",borderRadius:8,border:`1px solid ${isChg?'#7C3AED':C.border}`,background:isChg?"#8B5CF608":"transparent"}}>
                      <div style={{fontSize:11,fontWeight:600,color:isChg?"#7C3AED":C.text3,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>{label}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <input type="number" step="0.5" min={1} max={40} value={cur}
                          onChange={e=>{
                            const v=parseFloat(e.target.value)||parseFloat(def)
                            setSettings({...settings,cinemaHrs:{...(settings.cinemaHrs||{s1:8,s2:12,s3:9}),[st]:v}})
                          }}
                          style={{...inp({padding:"8px 10px",fontSize:14,textAlign:"center"}),width:80,fontWeight:700,border:`1px solid ${isChg?"#7C3AED":C.border}`,background:isChg?"#8B5CF608":C.bg}}/>
                        <span style={{fontSize:12,color:C.text3}}>hrs × size mult</span>
                      </div>
                      {isChg&&<div style={{fontSize:10,color:"#9CA3AF",marginTop:4}}>Default: {def} hrs</div>}
                    </div>
                  )
                })}
              </div>
            </Card>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn onClick={()=>saveSettings(settings)} disabled={saving}>Save Cinema Hours</Btn>
              <Btn onClick={()=>{const s={...settings,cinemaHrs:{s1:8,s2:12,s3:9}};setSettings(s);saveSettings(s)}} variant="ghost">Reset to Defaults</Btn>
            </div>
          </div>
        </div>
      )}

      {tab==="sizes"&&(
        <div>
          <p style={{margin:"0 0 14px",fontSize:13,color:C.text2,lineHeight:1.5}}>Room size boundaries and hour multipliers. The last tier has no upper boundary.</p>
          <Card style={{padding:20,marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:8}}>
              {["Tier","Label","Max m² (upper bound)","Multiplier"].map(h=><div key={h} style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</div>)}
            </div>
            {(settings.sizeTiers||DEF_SIZE_TIERS).map((tier,i)=>{
              const isLast=i===(settings.sizeTiers||DEF_SIZE_TIERS).length-1
              const update=(field,val)=>{
                const updated={...settings,sizeTiers:(settings.sizeTiers||DEF_SIZE_TIERS).map((t,j)=>j===i?{...t,[field]:val}:t)}
                setSettings(updated)
              }
              return(
                <div key={tier.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:8,alignItems:"center"}}>
                  <div style={{padding:"8px 12px",borderRadius:7,background:`${AMBER}12`,border:`1px solid ${AMBER}40`,fontSize:13,fontWeight:700,color:AMBER,textAlign:"center"}}>{tier.id}</div>
                  <input value={tier.label} onChange={e=>update("label",e.target.value)} style={inp({padding:"8px 11px"})}/>
                  <input type="number" min={1} max={9998} value={isLast?"":tier.max} disabled={isLast} onChange={e=>!isLast&&update("max",parseFloat(e.target.value)||tier.max)} style={inp({padding:"8px 11px",opacity:isLast?.4:1})}/>
                  <input type="number" step="0.05" min={0.5} max={3} value={tier.mult} onChange={e=>update("mult",parseFloat(e.target.value)||tier.mult)} style={inp({padding:"8px 11px"})}/>
                </div>
              )
            })}
          </Card>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>saveSettings(settings)} disabled={saving}>Save Room Sizes</Btn>
            <Btn onClick={()=>{const s={...settings,sizeTiers:DEF_SIZE_TIERS.map(t=>({...t}))};setSettings(s);saveSettings(s)}} variant="ghost">Reset to Defaults</Btn>
          </div>

          {/* Home Cinema Tiers */}
          <div style={{marginTop:24}}>
            <h4 style={{fontSize:13,fontWeight:700,color:"#7C3AED",margin:"0 0 4px"}}>🎬 Home Cinema — Room Size Tiers</h4>
            <p style={{fontSize:12,color:C.text2,margin:"0 0 12px",lineHeight:1.5}}>
              Home Cinema rooms use wider size boundaries and a higher Large multiplier than standard rooms. The Large tier (L) multiplier is cinema-specific and not inherited from standard sizes.
            </p>
            <Card style={{padding:20,marginBottom:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:8}}>
                {["Tier","Label","Max m² (upper bound)","Multiplier"].map(h=>(
                  <div key={h} style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</div>
                ))}
              </div>
              {(settings.cinemaTiers||CINEMA_TIERS).map((tier,i)=>{
                const isLast=i===(settings.cinemaTiers||CINEMA_TIERS).length-1
                const defTier=CINEMA_TIERS[i]
                const isChg=tier.max!==defTier?.max||tier.mult!==defTier?.mult||tier.label!==defTier?.label
                const update=(field,val)=>{
                  const updated={...settings,cinemaTiers:(settings.cinemaTiers||CINEMA_TIERS).map((t,j)=>j===i?{...t,[field]:val}:t)}
                  setSettings(updated)
                }
                return(
                  <div key={tier.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:8,alignItems:"center"}}>
                    <div style={{padding:"8px 12px",borderRadius:7,background:"#8B5CF612",border:"1px solid #8B5CF640",fontSize:13,fontWeight:700,color:"#7C3AED",textAlign:"center"}}>HC-{tier.id}</div>
                    <input value={tier.label} onChange={e=>update("label",e.target.value)} style={inp({padding:"8px 11px",border:isChg?`1px solid #7C3AED`:undefined})}/>
                    <input type="number" min={1} max={9998} value={isLast?"":tier.max} disabled={isLast}
                      onChange={e=>!isLast&&update("max",parseFloat(e.target.value)||tier.max)}
                      style={inp({padding:"8px 11px",opacity:isLast?.4:1,border:isChg?`1px solid #7C3AED`:undefined})}/>
                    <input type="number" step="0.05" min={0.5} max={3} value={tier.mult}
                      onChange={e=>update("mult",parseFloat(e.target.value)||tier.mult)}
                      style={inp({padding:"8px 11px",border:isChg?`1px solid #7C3AED`:undefined})}/>
                  </div>
                )
              })}
              <div style={{fontSize:11,color:"#9CA3AF",marginTop:8,lineHeight:1.6}}>
                Defaults: S &lt;25m² (1.0×) · M 25–40m² (1.1×) · L &gt;40m² (1.4×)
              </div>
            </Card>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>saveSettings(settings)} disabled={saving}>Save Cinema Tiers</Btn>
              <Btn onClick={()=>{const s={...settings,cinemaTiers:CINEMA_TIERS.map(t=>({...t}))};setSettings(s);saveSettings(s)}} variant="ghost">Reset to Defaults</Btn>
            </div>
          </div>
        </div>
      )}

      {tab==="s4"&&(
        <Card style={{padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <IL label="Monthly Floor Rate (₦)" hint="Minimum monthly retainer regardless of AV system value">
              <input type="number" value={settings.s4Floor||1000000} onChange={e=>setSettings({...settings,s4Floor:parseFloat(e.target.value)||1000000})} style={inp()}/>
            </IL>
            <IL label="% of AV System Value per month">
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" step="0.01" min={0.01} max={2} value={((settings.s4Pct||0.001)*100).toFixed(2)} onChange={e=>setSettings({...settings,s4Pct:parseFloat(e.target.value)/100||0.001})} style={inp({maxWidth:100})}/>
                <span style={{fontSize:13,color:C.text3}}>% per month</span>
              </div>
            </IL>
          </div>
          <Btn onClick={()=>saveSettings(settings)} disabled={saving}>{saving?"Saving...":"Save Stage 4 Settings"}</Btn>
        </Card>
      )}

      {tab==="templates"&&(
        <div>
          <div style={{marginBottom:16}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:600,color:C.text}}>Quote Templates</h3>
            <p style={{margin:"3px 0 0",fontSize:13,color:C.text2}}>Manage built-in and custom saved templates.</p>
          </div>
          <div style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>Built-in Templates (read-only)</div>
          {DEF_TEMPLATES.map(t=>(
            <Card key={t.id} style={{padding:14,marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:20}}>{t.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{t.name}</div>
                  <div style={{fontSize:12,color:C.text2,marginTop:1}}>{t.desc}</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:3}}>{t.rooms.length} rooms</div>
                </div>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:8,background:`${C.green}15`,color:C.green,fontWeight:500}}>Active</span>
              </div>
            </Card>
          ))}
          <div style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",margin:"18px 0 10px"}}>
            Custom Templates ({customTpls.length})
          </div>
          {customTpls.length===0?(
            <div style={{padding:20,textAlign:"center",color:C.text3,fontSize:13,border:`1px dashed ${C.border}`,borderRadius:8}}>
              No custom templates yet. Use "Save as Template" inside the Quote Builder to create one.
            </div>
          ):customTpls.map((t,i)=>(
            <Card key={t.id||i} style={{padding:14,marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:20}}>{t.icon||"📐"}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{t.name}</div>
                  {t.desc&&<div style={{fontSize:12,color:C.text2,marginTop:1}}>{t.desc}</div>}
                  <div style={{fontSize:11,color:C.text3,marginTop:3}}>
                    {t.rooms.length} rooms · Saved by {t.createdByName||"—"} · {t.createdAt?dateStr(t.createdAt):"—"}
                  </div>
                </div>
                <Btn onClick={async()=>{
                  const updated=customTpls.filter((_,j)=>j!==i)
                  await store.set("ced_templates",updated)
                  setCustomTpls(updated)
                  setMsg("Template deleted.")
                  setTimeout(()=>setMsg(""),2000)
                }} variant="danger" small>Delete</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab==="specifiers"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <h3 style={{margin:0,fontSize:15,fontWeight:600,color:C.text}}>Specifiers CRM</h3>
              <p style={{margin:"3px 0 0",fontSize:13,color:C.text2}}>Manage partner architect and MEP firms. New firms submitted by designers require your approval before quotes can proceed.</p>
            </div>
          </div>

          {specMsg&&<div style={{padding:"9px 14px",borderRadius:8,marginBottom:14,fontSize:13,
            background:specMsg.includes("✓")?"#F0FDF4":"#FEF2F2",
            border:`1px solid ${specMsg.includes("✓")?"#16A34A40":"#DC262640"}`,
            color:specMsg.includes("✓")?"#16A34A":"#DC2626"}}>{specMsg}</div>}

          {/* Pending Approval */}
          {crmSpecs.filter(s=>s.status==="pending").length>0&&(
            <div style={{marginBottom:24}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#D97706",textTransform:"uppercase",letterSpacing:".06em"}}>
                  Pending Approval ({crmSpecs.filter(s=>s.status==="pending").length})
                </div>
                <div style={{flex:1,height:1,background:"#D9770640"}}/>
              </div>
              {crmSpecs.filter(s=>s.status==="pending").map(s=>(
                <Card key={s.id} style={{padding:16,marginBottom:10,border:"2px solid #D9770650",background:"#FFFBEB"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <span style={{fontSize:22}}>{s.type==="architect"?"🏛":"⚙️"}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontSize:14,fontWeight:700,color:C.text}}>{s.company}</span>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:8,background:"#D9770620",color:"#D97706",fontWeight:700,border:"1px solid #D9770640"}}>{s.type==="architect"?"Architect":"MEP Consultant"}</span>
                      </div>
                      <div style={{fontSize:12,color:C.text2}}>{s.contact} · {s.email}{s.phone?" · "+s.phone:""}</div>
                      <div style={{fontSize:11,color:C.text3,marginTop:2}}>Submitted by {s.submittedBy||"Designer"} · {dateStr(s.submittedAt||s.createdAt)}</div>
                      <div style={{marginTop:10}}>
                        <IL label="Rejection reason (required to reject)" style={{marginBottom:6}}>
                          <input value={rejNotes[s.id]||""} onChange={e=>setRejNotes(r=>({...r,[s.id]:e.target.value}))}
                            placeholder="e.g. Not an approved partner at this time"
                            style={inp({fontSize:12})}/>
                        </IL>
                        <div style={{display:"flex",gap:8}}>
                          <Btn onClick={async()=>{
                            const updated=crmSpecs.map(x=>x.id===s.id?{...x,status:"approved",approvedAt:Date.now(),approvedBy:session.name,rejectionNotes:""}:x)
                            await store.saveSpecifiers(updated); setCrmSpecs(updated)
                            setSpecMsg("✓ "+s.company+" approved as a partner specifier.")
                            setTimeout(()=>setSpecMsg(""),4000)
                          }} small>✓ Approve</Btn>
                          <Btn onClick={async()=>{
                            if(!(rejNotes[s.id]||"").trim()){setSpecMsg("Please enter a rejection reason before rejecting.");setTimeout(()=>setSpecMsg(""),3000);return}
                            const updated=crmSpecs.map(x=>x.id===s.id?{...x,status:"rejected",rejectedAt:Date.now(),rejectedBy:session.name,rejectionNotes:rejNotes[s.id]}:x)
                            await store.saveSpecifiers(updated); setCrmSpecs(updated)
                            setRejNotes(r=>{const n={...r};delete n[s.id];return n})
                            setSpecMsg(s.company+" rejected — reason recorded.")
                            setTimeout(()=>setSpecMsg(""),4000)
                          }} variant="danger" small>✗ Reject</Btn>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Approved Partners */}
          {crmSpecs.filter(s=>(s.status||"approved")==="approved").length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:".06em"}}>
                  Approved Partners ({crmSpecs.filter(s=>(s.status||"approved")==="approved").length})
                </div>
                <div style={{flex:1,height:1,background:"#16A34A30"}}/>
              </div>
              {crmSpecs.filter(s=>(s.status||"approved")==="approved").map(s=>(
                <Card key={s.id} style={{padding:14,marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:20}}>{s.type==="architect"?"🏛":"⚙️"}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:2}}>
                        <span style={{fontSize:14,fontWeight:600,color:C.text}}>{s.company}</span>
                        <span style={{fontSize:10,padding:"2px 7px",borderRadius:6,background:"#16A34A15",color:"#16A34A",fontWeight:700,border:"1px solid #16A34A40"}}>{s.type==="architect"?"Architect":"MEP Consultant"}</span>
                      </div>
                      <div style={{fontSize:12,color:C.text2}}>{s.contact} · {s.email}{s.phone?" · "+s.phone:""}</div>
                      <div style={{fontSize:11,color:C.text3,marginTop:2}}>
                        Added {dateStr(s.createdAt)}{s.approvedBy?" · Approved by "+s.approvedBy:""} · {s.quoteCount||0} quote{(s.quoteCount||0)!==1?"s":""}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <Btn onClick={async()=>{
                        const updated=crmSpecs.map(x=>x.id===s.id?{...x,status:"rejected",rejectedAt:Date.now(),rejectedBy:session.name,rejectionNotes:"Revoked by Studio Lead"}:x)
                        await store.saveSpecifiers(updated); setCrmSpecs(updated)
                        setSpecMsg(s.company+" approval revoked.")
                        setTimeout(()=>setSpecMsg(""),4000)
                      }} variant="ghost" small>Revoke</Btn>
                      <Btn onClick={async()=>{const u=crmSpecs.filter(x=>x.id!==s.id);await store.saveSpecifiers(u);setCrmSpecs(u)}} variant="danger" small>Delete</Btn>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Rejected Firms */}
          {crmSpecs.filter(s=>s.status==="rejected").length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em"}}>
                  Rejected ({crmSpecs.filter(s=>s.status==="rejected").length})
                </div>
                <div style={{flex:1,height:1,background:C.border}}/>
              </div>
              {crmSpecs.filter(s=>s.status==="rejected").map(s=>(
                <Card key={s.id} style={{padding:14,marginBottom:8,opacity:.85}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:20,opacity:.5}}>{s.type==="architect"?"🏛":"⚙️"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:600,color:C.text3}}>{s.company}</div>
                      <div style={{fontSize:12,color:C.text3,marginTop:1}}>{s.contact} · {s.email}</div>
                      {s.rejectionNotes&&<div style={{fontSize:11,color:C.red,marginTop:2}}>Reason: {s.rejectionNotes}</div>}
                      <div style={{fontSize:11,color:C.text3,marginTop:1}}>Rejected {s.rejectedAt?dateStr(s.rejectedAt):""}{ s.rejectedBy?" by "+s.rejectedBy:""}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <Btn onClick={async()=>{
                        const updated=crmSpecs.map(x=>x.id===s.id?{...x,status:"approved",approvedAt:Date.now(),approvedBy:session.name,rejectionNotes:""}:x)
                        await store.saveSpecifiers(updated); setCrmSpecs(updated)
                        setSpecMsg("✓ "+s.company+" re-approved.")
                        setTimeout(()=>setSpecMsg(""),4000)
                      }} small>Re-approve</Btn>
                      <Btn onClick={async()=>{const u=crmSpecs.filter(x=>x.id!==s.id);await store.saveSpecifiers(u);setCrmSpecs(u)}} variant="danger" small>Delete</Btn>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {crmSpecs.length===0&&(
            <div style={{padding:24,textAlign:"center",color:C.text3,fontSize:13,border:`1px dashed ${C.border}`,borderRadius:8}}>
              No specifier firms yet. Designers add them when creating Specifier quotes — they appear here for your approval.
            </div>
          )}
        </div>
      )}

      {tab==="usd"&&(
        <div>
          <Card style={{padding:20,marginBottom:16}}>
            <h4 style={{margin:"0 0 4px",fontSize:15,fontWeight:600,color:C.text}}>USD Exchange Rate</h4>
            <p style={{margin:"0 0 16px",fontSize:13,color:C.text2,lineHeight:1.6}}>
              Set the NGN → USD exchange rate used when generating quotes for international clients.
              Applied on-demand when USD is selected on a quote — stored NGN values are never changed.
              Update this rate before generating any USD-denominated quote.
            </p>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:C.text2,flexShrink:0}}>₦1 USD =</span>
              <input type="number" step="1" min={1}
                value={settings.usdRate||1600}
                onChange={e=>setSettings({...settings,usdRate:parseFloat(e.target.value)||1600})}
                style={{...inp({fontSize:15,fontWeight:600}),maxWidth:140}}/>
              <span style={{fontSize:13,color:C.text2,flexShrink:0}}>NGN</span>
              <Btn onClick={()=>saveSettings(settings)} disabled={saving} style={{marginLeft:4}}>
                {saving?"Saving...":"Save Exchange Rate"}
              </Btn>
            </div>
            <div style={{padding:14,borderRadius:8,background:`${AMBER}10`,border:`1px solid ${AMBER}40`,lineHeight:1.9}}>
              <div style={{fontSize:13,fontWeight:600,color:"#92400E",marginBottom:6}}>
                Conversion preview @ ₦{(settings.usdRate||1600).toLocaleString("en-NG")} / $1 USD
              </div>
              {[1000000,5000000,10000000,25000000,50000000].map(n=>(
                <div key={n} style={{fontSize:12,color:"#78350F"}}>
                  ₦{n.toLocaleString("en-NG")} → <strong>${Math.round(n/(settings.usdRate||1600)).toLocaleString("en-US")}</strong>
                </div>
              ))}
            </div>
          </Card>
          <div style={{padding:12,borderRadius:8,background:"#eff6ff",border:"1px solid #bfdbfe",fontSize:12,color:"#1e40af",lineHeight:1.7}}>
            <strong>How USD conversion works:</strong> All quotes are stored in NGN.
            When you open a quote and switch to USD view, all fees are divided by this rate and displayed in dollars.
            The downloaded HTML quote reflects the selected currency, and always includes the exchange rate and NGN equivalent for transparency.
          </div>
        </div>
      )}

      {tab==="security"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* Email Settings — studio + lead email */}
          <Card style={{padding:20}}>
            <h4 style={{margin:"0 0 4px",fontSize:15,fontWeight:600,color:C.text}}>Email Settings</h4>
            <p style={{margin:"0 0 14px",fontSize:13,color:C.text2}}>
              Both addresses are CC'd on every outgoing quote email. Change them here for a global update across all quotes.
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <IL label="Studio Unit Email (CC on all quotes)">
                <TI type="email" value={settings.studioEmail||"design@ced.africa"}
                  onChange={v=>setSettings({...settings,studioEmail:v})}
                  placeholder="design@ced.africa"/>
              </IL>
              <IL label="Studio Lead Email (CC on all quotes)">
                <TI type="email" value={settings.leadEmail||"tonyemelukwe@ced.africa"}
                  onChange={v=>setSettings({...settings,leadEmail:v})}
                  placeholder="tonyemelukwe@ced.africa"/>
              </IL>
            </div>
            <Btn onClick={()=>saveSettings(settings)} disabled={saving}>{saving?"Saving...":"Save Email Settings"}</Btn>
          </Card>

          {/* Recovery Code — for Studio Lead account reset */}
          <Card style={{padding:20}}>
            <h4 style={{margin:"0 0 4px",fontSize:15,fontWeight:600,color:C.text}}>Studio Lead Recovery Code</h4>
            <p style={{margin:"0 0 14px",fontSize:13,color:C.text2}}>
              This code allows the Studio Lead to reset their own login password from the sign-in screen if locked out. Keep it secret and store it somewhere safe outside this app.
            </p>
            <div style={{padding:"10px 14px",borderRadius:8,background:`${AMBER}10`,border:`1px solid ${AMBER}40`,fontSize:12,color:"#92400E",marginBottom:14,lineHeight:1.6}}>
              <strong>Default recovery code:</strong> CEDRECOVER — change it below immediately if you have not already done so.
            </div>
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                <IL label="New Recovery Code">
                  <input type="password" value={rc} onChange={e=>setRc(e.target.value)}
                    placeholder="Enter new recovery code" autoComplete="new-password"
                    style={{...inp(),letterSpacing:"0.08em"}}/>
                </IL>
                <IL label="Confirm Recovery Code">
                  <input type="password" value={rcConfirm} onChange={e=>setRcConfirm(e.target.value)}
                    placeholder="Repeat to confirm" autoComplete="new-password"
                    style={{...inp(),letterSpacing:"0.08em"}}/>
                </IL>
              </div>
              {rcMsg&&<div style={{padding:"8px 12px",borderRadius:7,marginBottom:12,fontSize:13,
                background:rcMsg.includes("✓")?"#F0FDF4":"#fef2f2",
                border:`1px solid ${rcMsg.includes("✓")?C.green:C.red}30`,
                color:rcMsg.includes("✓")?C.green:C.red}}>{rcMsg}</div>}
              <Btn onClick={()=>{
                if(!rc){setRcMsg("Please enter a new recovery code.");return}
                if(rc.length<6){setRcMsg("Recovery code must be at least 6 characters.");return}
                if(rc!==rcConfirm){setRcMsg("Recovery codes do not match.");return}
                const s={...settings,recoveryCode:hp(rc)}
                saveSettings(s)
                setRc("");setRcConfirm("")
                setRcMsg("✓ Recovery code updated successfully.")
                setTimeout(()=>setRcMsg(""),3000)
              }} disabled={!rc||!rcConfirm||saving}>Update Recovery Code</Btn>
            </div>
          </Card>

          {/* Labour Rate — standalone section */}
          <Card style={{padding:20}}>
            <h4 style={{margin:"0 0 4px",fontSize:15,fontWeight:600,color:C.text}}>Labour Rate</h4>
            <p style={{margin:"0 0 14px",fontSize:13,color:C.text2}}>Standard hourly rate applied to all 3 design stages. All quotes recalculate immediately.</p>
            <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:12,alignItems:"flex-end"}}>
              <IL label="Rate (₦ per hour)" style={{marginBottom:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14,color:C.text2,flexShrink:0}}>₦</span>
                  <input type="number" value={settings.rate||80000} onChange={e=>setSettings({...settings,rate:parseFloat(e.target.value)||80000})} style={inp({fontSize:15,fontWeight:600})}/>
                  <span style={{fontSize:13,color:C.text3,flexShrink:0}}>/hr</span>
                </div>
              </IL>
              <div style={{paddingBottom:0}}>
                <Btn onClick={()=>saveSettings(settings)} disabled={saving}>{saving?"Saving...":"Save Labour Rate"}</Btn>
              </div>
            </div>
          </Card>

          {/* Admin Password — standalone section */}
          <Card style={{padding:20}}>
            <h4 style={{margin:"0 0 4px",fontSize:15,fontWeight:600,color:C.text}}>Change Admin Panel Password</h4>
            <p style={{margin:"0 0 14px",fontSize:13,color:C.text2}}>This password is required to access the Admin Panel. Keep it secure and share only with authorised Studio Leads.</p>
            {pwdChangeMsg&&(
              <div style={{padding:"8px 12px",borderRadius:7,marginBottom:12,fontSize:13,
                background:pwdChangeMsg.includes("✓")?`${C.green}15`:"#fef2f2",
                border:`1px solid ${pwdChangeMsg.includes("✓")?C.green:C.red}30`,
                color:pwdChangeMsg.includes("✓")?C.green:C.red}}>
                {pwdChangeMsg}
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <IL label="New Password">
                <input
                  type="password"
                  value={newAdminPwd}
                  onChange={e=>setNewAdminPwd(e.target.value)}
                  placeholder="Enter new admin password"
                  style={{...inp(),letterSpacing:"0.08em"}}
                  autoComplete="new-password"
                />
              </IL>
              <IL label="Confirm New Password">
                <input
                  type="password"
                  value={confirmAdminPwd}
                  onChange={e=>setConfirmAdminPwd(e.target.value)}
                  placeholder="Re-enter to confirm"
                  style={{...inp(),letterSpacing:"0.08em"}}
                  autoComplete="new-password"
                />
              </IL>
            </div>
            <Btn
              onClick={()=>{
                if(!newAdminPwd){setPwdChangeMsg("Please enter a new password.");return}
                if(newAdminPwd.length<6){setPwdChangeMsg("Password must be at least 6 characters.");return}
                if(newAdminPwd!==confirmAdminPwd){setPwdChangeMsg("Passwords do not match.");return}
                const s={...settings,adminPwd:hp(newAdminPwd)}
                saveSettings(s)
                setNewAdminPwd("")
                setConfirmAdminPwd("")
                setPwdChangeMsg("✓ Admin password changed successfully.")
                setTimeout(()=>setPwdChangeMsg(""),3000)
              }}
              disabled={!newAdminPwd||!confirmAdminPwd||saving}
            >
              Change Admin Password
            </Btn>
          </Card>

        </div>
      )}

      {tab==="tc"&&(
        <div>
          <p style={{margin:"0 0 12px",fontSize:13,color:C.text2,lineHeight:1.5}}>Standard exclusions printed on every quotation.</p>
          {(settings.exclusions||[]).map((ex,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:7,alignItems:"flex-start"}}>
              <span style={{fontSize:12,color:C.text3,marginTop:9,minWidth:18}}>{i+1}.</span>
              <textarea value={ex} rows={2} onChange={e=>setSettings({...settings,exclusions:settings.exclusions.map((x,j)=>j===i?e.target.value:x)})} style={{...inp(),resize:"vertical",flex:1,fontSize:12}}/>
              <button onClick={()=>setSettings({...settings,exclusions:settings.exclusions.filter((_,j)=>j!==i)})} style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",color:C.text3,cursor:"pointer",fontSize:14,marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={()=>setSettings({...settings,exclusions:[...(settings.exclusions||[]),""]})
            } style={{padding:"7px 14px",borderRadius:7,border:`1px solid ${AMBER}`,background:"transparent",color:AMBER,fontSize:12,cursor:"pointer"}}>+ Add Exclusion</button>
            <Btn onClick={()=>saveSettings(settings)} disabled={saving}>{saving?"Saving...":"Save Exclusions"}</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ── HTML Quote Generator ───────────────────────────────────
// ── Stage 4 Monthly Retainer Invoice ──────────────────────────
function buildRetainerInvoice(quote, calc, settings, monthNum) {
  const proj=quote.proj||{}
  const mn=monthNum||1
  const invRef=(quote.ref||"CED").replace(/\//g,"-")+"-S4-INV"+String(mn).padStart(2,"0")
  const nf=n=>"₦"+Math.round(n).toLocaleString("en-NG")
  const today=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})
  const due=new Date(Date.now()+14*86400000).toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})
  const amt=calc.s4Monthly||0
  const vat=Math.round(amt*0.075)
  const total=amt+vat
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${invRef}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#f8f7f5;font-size:13px}.page{max-width:800px;margin:0 auto;padding:48px 40px;background:#fff}.toolbar{background:#1a1a1a;padding:12px 28px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0}table{width:100%;border-collapse:collapse}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e5e4e0}th{background:#f8f7f5;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em}@media print{.toolbar{display:none!important}body{background:#fff}.page{padding:32px 40px}}</style>
</head><body>
<div class="toolbar"><div style="display:flex;align-items:center;gap:10px"><div style="background:#D97706;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px">CED AFRICA</div><span style="color:#aaa;font-size:13px">Retainer Invoice · ${invRef}</span></div><button onclick="window.print()" style="padding:8px 18px;border-radius:7px;border:none;background:#D97706;color:#fff;font-size:13px;cursor:pointer;font-weight:600">🖨 Print / Save PDF</button></div>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e5e4e0">
    <div><div style="font-size:11px;color:#D97706;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">CED Africa — AV Consulting Design Services</div><div style="font-size:30px;font-weight:700">TAX INVOICE</div><div style="font-size:13px;color:#888;margin-top:4px">Stage 4 — Project Delivery Governance Retainer</div></div>
    <div style="text-align:right"><div style="font-size:12px;color:#888">Invoice No.</div><div style="font-size:18px;font-weight:700;margin:3px 0">${invRef}</div><div style="font-size:12px;color:#888">Date: ${today}</div><div style="font-size:12px;color:#888">Due: ${due}</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px">
    <div><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Bill To</div><div style="font-size:16px;font-weight:700">${proj.client||"—"}</div>${proj.address?`<div style="font-size:13px;color:#4a4a4a;margin-top:3px">${proj.address}</div>`:""} ${proj.ownerEmail?`<div style="font-size:13px;color:#4a4a4a;margin-top:2px">${proj.ownerEmail}</div>`:""}</div>
    <div><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Project</div><div style="font-size:16px;font-weight:700">${quote.projectName||"—"}</div><div style="font-size:13px;color:#888;margin-top:3px">Quote Ref: ${quote.ref}</div><div style="font-size:13px;color:#888">Month ${mn} of ${quote.cfg?.s4Months||12}</div></div>
  </div>
  <table style="margin-bottom:24px"><thead><tr><th>Description</th><th style="text-align:right;width:90px">Unit</th><th style="text-align:right;width:130px">Rate</th><th style="text-align:right;width:130px">Amount</th></tr></thead>
  <tbody>
    <tr><td><div style="font-weight:600">Stage 4 — Project Delivery Governance</div><div style="font-size:12px;color:#888;margin-top:2px">Monthly retainer — Month ${mn} of ${quote.cfg?.s4Months||12}</div><div style="font-size:12px;color:#888">Project: ${quote.projectName} · ${quote.ref}</div></td><td style="text-align:right">1 month</td><td style="text-align:right">${nf(amt)}/mo</td><td style="text-align:right;font-weight:600">${nf(amt)}</td></tr>
    <tr><td colspan="3" style="text-align:right;color:#888">Subtotal</td><td style="text-align:right">${nf(amt)}</td></tr>
    <tr><td colspan="3" style="text-align:right;color:#888">VAT (7.5%)</td><td style="text-align:right">${nf(vat)}</td></tr>
    <tr style="background:#f8f7f5;border-top:2px solid #D97706"><td colspan="3" style="text-align:right;font-size:15px;font-weight:700">Total Due</td><td style="text-align:right;font-size:18px;font-weight:700;color:#D97706">${nf(total)}</td></tr>
  </tbody></table>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px">
    <div style="padding:16px;border:1px solid #e5e4e0;border-radius:10px"><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Payment Information</div><div style="font-size:13px;line-height:1.8"><div><strong>USD:</strong> Custom Electronics Distribution</div><div>Standard Chartered · A/C: 0005866571</div><div style="margin-top:6px"><strong>NGN:</strong> Custom Electronics Distribution</div><div>Access Bank · A/C: 0073984770</div></div></div>
    <div style="padding:16px;border:1px solid #e5e4e0;border-radius:10px"><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Payment Terms</div><div style="font-size:13px;line-height:1.8"><div>Due within <strong>14 days</strong> of invoice date.</div><div>Late payments attract 2% per month.</div><div style="margin-top:6px;color:#888;font-size:12px">Ref <strong>${invRef}</strong> on payment.</div></div></div>
  </div>
  <div style="text-align:center;font-size:11px;color:#aaa;padding-top:20px;border-top:1px solid #e5e4e0"><div style="font-weight:600;color:#888;margin-bottom:3px">CED Africa — Customer Electronics Distribution Limited</div><div>17 Adeyemo Alakija St, Victoria Island, Lagos 101241 · 0808 666 2168 · design@ced.africa · cedafrica.com</div></div>
</div></body></html>`
}


// ════════════════════════════════════════════════════════════════
// CLIENT DISCOVERY MODULE
// ════════════════════════════════════════════════════════════════

function buildDiscoveryHTML(disc, settings) {
  const cedEmail   = settings.studioEmail||"design@ced.africa"
  const cedPhone   = "0808 666 2168"
  const discId     = disc.id
  const clientName = disc.clientName||"Valued Client"
  const projName   = disc.projectName||"Your Project"

  var systemsHTML = ""
  DISC_SYSTEMS.forEach(function(grp) {
    var rows = ""
    grp.systems.forEach(function(s) {
      rows += "<div class='sys-row'><div class='sys-info'><div class='sys-label'>" + s.label + "</div><div class='sys-desc'>" + s.desc + "</div></div>"
      rows += "<div class='rating-group'>"
      rows += "<label class='rating-opt not-int'><input type='radio' name='sys_" + s.id + "' value='not_interested'/><span>Not Interested</span></label>"
      rows += "<label class='rating-opt nice'><input type='radio' name='sys_" + s.id + "' value='nice_to_have'/><span>Nice to Have</span></label>"
      rows += "<label class='rating-opt must'><input type='radio' name='sys_" + s.id + "' value='must_have'/><span>Must Have</span></label>"
      rows += "</div></div>"
    })
    systemsHTML += "<div class='sys-group'><div class='sys-group-title'>" + grp.cat + "</div>" + rows + "</div>"
  })

  var allSystems = []
  DISC_SYSTEMS.forEach(function(g){ g.systems.forEach(function(s){ allSystems.push(s) }) })
  var colHeaders = ""
  allSystems.forEach(function(s){
    colHeaders += "<th class='zone-sys-hd'><div class='zone-sys-label'>" + s.label + "</div></th>"
  })
  var zoneRows = ""
  DISC_ZONES.forEach(function(z){
    var cells = ""
    allSystems.forEach(function(s){
      cells += "<td class='zone-cell'><label class='zone-check'><input type='checkbox' name='zone_" + z.id + "_" + s.id + "'/><span class='zone-tick'></span></label></td>"
    })
    zoneRows += "<tr><td class='zone-name-cell'><div class='zone-label'>" + z.label + "</div><div class='zone-hint'>" + z.hint + "</div></td>" + cells + "</tr>"
  })

  var bedroomOpts = ["1","2","3","4","5","6","7+"].map(function(n){ return "<option>" + n + "</option>" }).join("")
  var lifestyleOpts = [["family","Family Home with Children"],["entertain","Entertainment & Hosting"],["wfh","Work from Home"],["security","Security is a Priority"],["luxury","Luxury & Prestige"],["wellness","Wellness & Relaxation"]].map(function(x){ return "<label class='lifestyle-check'><input type='checkbox' name='lifestyle' value='" + x[0] + "'/><span>" + x[1] + "</span></label>" }).join("")
  var techOpts = [["simple","Keep it simple — I want it to just work"],["comfortable","Comfortable — I can handle a smart home app"],["savvy","Tech-savvy — I enjoy advanced features"]].map(function(x){ return "<label class='tech-opt'><input type='radio' name='techComfort' value='" + x[0] + "'/>" + x[1] + "</label>" }).join("")
  var whoOpts = [["me","Myself only"],["family","Family members"],["staff","Household staff"],["all","Everyone in the home"]].map(function(x){ return "<label class='tech-opt'><input type='radio' name='whoOperates' value='" + x[0] + "'/>" + x[1] + "</label>" }).join("")
  var budgetOpts = [["value","Value","Good technology, smartly specified"],["standard","Standard","Quality systems, well designed"],["premium","Premium","Best-in-class, fully integrated"],["ultra","Ultra Premium","No constraints — the finest available"]].map(function(x){ return "<label class='budget-opt'><input type='radio' name='budget' value='" + x[0] + "'/><div class='b-label'>" + x[1] + "</div><div class='b-sub'>" + x[2] + "</div></label>" }).join("")
  var knownSystemOpts = [["control4","Control4"],["crestron","Crestron Home"],["lutron","Lutron"],["savant","Savant"],["knx","KNX"],["google","Google Home"],["alexa","Amazon Alexa"],["none","None of the above"]].map(function(x){ return "<label class='lifestyle-check'><input type='checkbox' name='knownSystems' value='" + x[0] + "'/><span>" + x[1] + "</span></label>" }).join("")

  var collectSystems = ""
  DISC_SYSTEMS.forEach(function(g){ g.systems.forEach(function(s){ collectSystems += "var r_" + s.id + "=document.querySelector(\"input[name=sys_" + s.id + "]:checked\");if(r_" + s.id + ")data.systems[\"" + s.id + "\"]=r_" + s.id + ".value;\n" }) })
  var collectZones = ""
  DISC_ZONES.forEach(function(z){ allSystems.forEach(function(s){ collectZones += "if(document.querySelector(\"input[name=zone_" + z.id + "_" + s.id + "]:checked\")){data.zones[\"" + z.id + "\"]=data.zones[\"" + z.id + "\"]||[];data.zones[\"" + z.id + "\"].push(\"" + s.id + "\");}\n" }) })
  var collectKnown = "data.knownSystems=Array.from(document.querySelectorAll(\"input[name=knownSystems]:checked\")).map(function(e){return e.value});\n"

  var css = [
    "*{box-sizing:border-box;margin:0;padding:0}",
    "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f7f5;color:#1a1a1a;font-size:14px;line-height:1.6}",
    ".toolbar{background:#1a1a1a;padding:14px 28px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100;flex-wrap:wrap;gap:10px}",
    ".page{max-width:960px;margin:0 auto;padding:36px 24px}",
    "h1{font-size:26px;font-weight:700;margin-bottom:6px}",
    "h2{font-size:14px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:.07em;margin:28px 0 12px;padding-bottom:8px;border-bottom:2px solid #D97706}",
    ".card{background:#fff;border:1px solid #d0cfc9;border-radius:12px;padding:24px;margin-bottom:20px}",
    ".field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px}",
    ".field{display:flex;flex-direction:column;gap:5px}",
    "label.fl{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em}",
    "input[type=text],input[type=email],select,textarea{width:100%;padding:10px 14px;border:2px solid #d0cfc9;border-radius:8px;font-size:14px;font-family:inherit;background:#fff;outline:none;transition:border .15s}",
    "input:focus,select:focus,textarea:focus{border-color:#D97706}",
    ".lifestyle-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:14px}",
    ".lifestyle-check{display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #d0cfc9;border-radius:8px;cursor:pointer;font-size:13px;transition:all .15s}",
    ".lifestyle-check:has(input:checked){border-color:#D97706;background:#fffbeb}",
    ".lifestyle-check input{accent-color:#D97706;width:15px;height:15px}",
    ".tech-options{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}",
    ".tech-opt{padding:9px 16px;border:2px solid #d0cfc9;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all .15s}",
    ".tech-opt:has(input:checked){border-color:#D97706;background:#fffbeb;color:#92400E;font-weight:700}",
    ".tech-opt input{display:none}",
    ".sys-group{margin-bottom:24px}",
    ".sys-group-title{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;padding:5px 10px;background:#f0ede8;border-radius:6px}",
    ".sys-row{display:flex;align-items:flex-start;justify-content:space-between;padding:14px 8px;border-bottom:1px solid #f0ede8;flex-wrap:wrap;gap:10px}",
    ".sys-info{flex:1;min-width:220px;padding-right:16px}",
    ".sys-label{font-size:14px;font-weight:600;color:#1a1a1a;margin-bottom:4px}",
    ".sys-desc{font-size:12px;color:#666;line-height:1.6}",
    ".rating-group{display:flex;gap:6px;flex-wrap:wrap;align-items:center;flex-shrink:0}",
    ".rating-opt{display:flex;align-items:center;gap:5px;padding:8px 14px;border:1.5px solid #d0cfc9;border-radius:20px;cursor:pointer;font-size:12px;font-weight:500;transition:all .15s;white-space:nowrap}",
    ".rating-opt input{display:none}",
    ".rating-opt.not-int:has(input:checked){border-color:#888;background:#f0f0f0;color:#444;font-weight:700}",
    ".rating-opt.nice:has(input:checked){border-color:#D97706;background:#fffbeb;color:#92400E;font-weight:700}",
    ".rating-opt.must:has(input:checked){border-color:#16A34A;background:#f0fdf4;color:#15803d;font-weight:700}",
    ".zone-table{width:100%;border-collapse:collapse;font-size:12px}",
    ".zone-sys-hd{padding:8px 4px;text-align:center;border-bottom:2px solid #D97706;min-width:68px;vertical-align:bottom}",
    ".zone-sys-label{font-size:10px;font-weight:700;color:#D97706;text-transform:uppercase;writing-mode:vertical-rl;transform:rotate(180deg);height:80px;display:flex;align-items:center}",
    ".zone-name-cell{padding:10px 12px;border-bottom:1px solid #e5e4e0;min-width:200px;vertical-align:middle}",
    ".zone-label{font-size:13px;font-weight:600;color:#1a1a1a}",
    ".zone-hint{font-size:11px;color:#888;margin-top:2px;line-height:1.4}",
    ".zone-cell{text-align:center;border-bottom:1px solid #e5e4e0;border-left:1px solid #f0ede8;padding:8px 4px}",
    ".zone-check{display:flex;justify-content:center;align-items:center;cursor:pointer}",
    ".zone-check input{width:16px;height:16px;accent-color:#D97706;cursor:pointer}",
    "tr:hover .zone-name-cell,tr:hover .zone-cell{background:#fffbeb20}",
    ".budget-grid{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}",
    ".budget-opt{flex:1;min-width:140px;padding:14px 16px;border:2px solid #d0cfc9;border-radius:10px;cursor:pointer;text-align:center;transition:all .15s}",
    ".budget-opt:has(input:checked){border-color:#D97706;background:#fffbeb}",
    ".budget-opt input{display:none}",
    ".b-label{font-size:14px;font-weight:700;margin-bottom:3px}",
    ".b-sub{font-size:11px;color:#888}",
    ".cinema-card{display:none;border-color:#7C3AED40;background:#F5F3FF}",
    ".submit-btn{width:100%;padding:16px;background:#D97706;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;margin-top:8px}",
    ".done-msg{display:none;padding:20px;background:#f0fdf4;border:2px solid #16A34A;border-radius:10px;text-align:center;margin-top:16px}",
    ".divider{margin-top:16px;padding-top:16px;border-top:1px solid #e5e4e0}",
    "@media(max-width:700px){.field-row{grid-template-columns:1fr}.sys-row{flex-direction:column}.zone-table{display:block;overflow-x:auto}}",
    "@media print{.toolbar{display:none!important}}"
  ].join("\n")

  var html = "<!DOCTYPE html><html lang='en'><head>\n"
  html += "<meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'>\n"
  html += "<title>CED Africa Home Technology Discovery - " + projName + "</title>\n"
  html += "<style>\n" + css + "\n</style></head><body>\n"
  html += "<div class='toolbar'><div style='display:flex;align-items:center;gap:12px'><div style='background:#D97706;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:5px'>CED AFRICA</div><span style='color:#aaa;font-size:13px'>Home Technology Discovery - " + projName + "</span></div><div style='color:#888;font-size:12px'>" + cedEmail + " &middot; " + cedPhone + "</div></div>\n"
  html += "<div class='page'>\n"
  html += "<h1>Welcome, " + clientName + "</h1>\n"
  html += "<p style='font-size:15px;color:#4a4a4a;margin-bottom:24px;max-width:680px'>This form helps our design team understand your lifestyle and technology vision before your consultation. There are no right or wrong answers. <strong>It takes about 8-10 minutes.</strong></p>\n"

  html += "<h2>1. About Your Home</h2>\n"
  html += "<div class='card'>"
  html += "<div class='field-row'><div class='field'><label class='fl'>Your Full Legal Name</label><input type='text' id='ownerName' placeholder='e.g. Toochukwu Onyemelukwe'/></div><div class='field'><label class='fl'>Your Email Address</label><input type='email' id='ownerEmail' placeholder='e.g. you@example.com'/></div></div>"
  html += "<div class='field-row'><div class='field'><label class='fl'>WhatsApp Number</label><input type='text' id='ownerWhatsApp' placeholder='e.g. +234 808 000 0000'/></div><div class='field'></div></div>"
  html += "<div class='field-row'><div class='field'><label class='fl'>Property / Project Name</label><input type='text' id='projName' value='" + projName + "'/></div><div class='field'><label class='fl'>Property Address</label><input type='text' id='address' placeholder='Street, City'/></div></div>"
  html += "<div class='field-row'><div class='field'><label class='fl'>Property Type</label><select id='propType'><option value=''>Select...</option><option>Apartment / Flat</option><option>Terrace House</option><option>Detached Villa</option><option>Semi-Detached</option><option>Penthouse</option><option>Other</option></select></div><div class='field'><label class='fl'>Construction Stage</label><select id='constructionStage'><option value=''>Select...</option><option value='new_build'>New Build</option><option value='renovation'>Major Renovation</option><option value='retrofit'>Retrofit — finished building</option><option value='planning'>Planning Stage</option></select></div></div>"
  html += "<div class='field-row'><div class='field'><label class='fl'>Number of Bedrooms</label><select id='bedrooms'><option value=''>Select...</option>" + bedroomOpts + "</select></div><div class='field'><label class='fl'>Expected Move-in / Completion</label><input type='text' id='moveIn' placeholder='e.g. Q3 2026'/></div></div>"
  html += "<div class='divider'><label class='fl' style='display:block;margin-bottom:10px'>Your Architect (Optional)</label>"
  html += "<div class='field-row'><div class='field'><label class='fl'>Firm Name</label><input type='text' id='archCompany' placeholder='e.g. Spacefinish Architects'/></div><div class='field'><label class='fl'>Contact Name</label><input type='text' id='archContact' placeholder='e.g. Tunde Adeyemi'/></div></div>"
  html += "<div class='field-row'><div class='field'><label class='fl'>Architect Email</label><input type='email' id='archEmail' placeholder='architect@firm.com'/></div><div class='field'><label class='fl'>Architect Phone</label><input type='text' id='archPhone' placeholder='+234 xxx xxxx'/></div></div>"
  html += "</div></div>\n"

  html += "<h2>2. Your Lifestyle</h2>\n"
  html += "<div class='card'>"
  html += "<div class='field' style='margin-bottom:16px'><label class='fl' style='margin-bottom:8px'>How do you primarily use your home? (Select all that apply)</label><div class='lifestyle-grid'>" + lifestyleOpts + "</div></div>"
  html += "<div class='field' style='margin-bottom:16px'><label class='fl' style='margin-bottom:8px'>Your technology comfort level</label><div class='tech-options'>" + techOpts + "</div></div>"
  html += "<div class='field'><label class='fl' style='margin-bottom:8px'>Who will primarily operate the home technology?</label><div class='tech-options'>" + whoOpts + "</div></div>"
  html += "</div>\n"

  html += "<h2>3. Which Systems Interest You?</h2>\n"
  html += "<p style='font-size:13px;color:#4a4a4a;margin-bottom:14px;line-height:1.7'>Read each description and rate your interest. <strong style='color:#16A34A'>Must Have</strong> = core to your vision. <strong style='color:#D97706'>Nice to Have</strong> = flexible. <strong style='color:#888'>Not Interested</strong> = skip entirely.</p>\n"
  html += "<div class='card'>" + systemsHTML + "</div>\n"

  html += "<h2>4. Where Do You Want Each System?</h2>\n"
  html += "<p style='font-size:13px;color:#4a4a4a;margin-bottom:14px;line-height:1.7'>For each zone of your home, tick the systems you would like installed there. You do not need to know individual room names.</p>\n"
  html += "<div class='card' style='overflow-x:auto'>"
  html += "<table class='zone-table'><thead><tr><th style='text-align:left;padding:8px 12px;border-bottom:2px solid #D97706;font-size:11px;color:#888;font-weight:700'>Home Zone</th>" + colHeaders + "</tr></thead><tbody>" + zoneRows + "</tbody></table>"
  html += "</div>\n"

  html += "<div id='cinema-card' class='card cinema-card'>\n"
  html += "<h2 style='margin-top:0'>5. Home Cinema 3D Render Design</h2>"
  html += "<p style='font-size:13px;color:#4a4a4a;margin-bottom:16px;line-height:1.6'>You have selected a Home Cinema. We offer a photorealistic 3D render of your cinema space — showing the screen wall, acoustic treatment, seating arrangement, ambient lighting, and speaker positions — giving you a clear visual of your cinema before any construction begins.</p>"
  html += "<div class='tech-options'>"
  html += "<label class='tech-opt' style='border-color:#7C3AED40'><input type='radio' name='cinemaRender' value='yes'/>Yes — include a 3D Render Design for my Home Cinema</label>"
  html += "<label class='tech-opt'><input type='radio' name='cinemaRender' value='no'/>No — not required at this stage</label>"
  html += "</div></div>\n"

  html += "<h2>6. Your Smart Home Experience</h2>\n"
  html += "<div class='card'>"
  html += "<div class='field' style='margin-bottom:20px'><label class='fl' style='margin-bottom:8px'>Have you lived in or experienced a smart home before?</label><div class='tech-options'>"
  html += "<label class='tech-opt'><input type='radio' name='smartHomeExp' value='yes_own'/>Yes — I currently live in one</label>"
  html += "<label class='tech-opt'><input type='radio' name='smartHomeExp' value='yes_visited'/>Yes — I have visited or stayed in one</label>"
  html += "<label class='tech-opt'><input type='radio' name='smartHomeExp' value='no'/>No — this will be my first experience</label>"
  html += "</div></div>"
  html += "<div class='field' style='margin-bottom:20px'><label class='fl' style='margin-bottom:8px'>Are you familiar with any of these systems? (Select all that apply)</label>"
  html += "<div class='lifestyle-grid' style='grid-template-columns:repeat(auto-fill,minmax(160px,1fr))'>" + knownSystemOpts + "</div></div>"
  html += "<div class='field'><label class='fl'>Preferences or systems you specifically want or want to avoid?</label><textarea id='systemPrefs' rows='2' placeholder='e.g. I love how Control4 works, or I specifically want Lutron lighting...'></textarea></div>"
  html += "</div>\n"

  html += "<h2>7. Your Technology Wishlist</h2>\n"
  html += "<div class='card'>"
  html += "<p style='font-size:13px;color:#4a4a4a;margin-bottom:14px;line-height:1.6'>This is your space to dream. Describe anything you have seen, experienced, or imagined for your home — no matter how ambitious. Our designers will tell you what is possible and how to achieve it.</p>"
  html += "<textarea id='wishlist' rows='5' placeholder='e.g. I want the lights to come on when I arrive home. I saw a home cinema with a starfield ceiling and would love that. I want my kids rooms simple but full control from my phone...'></textarea>"
  html += "</div>\n"

  html += "<h2>8. Budget and Timeline</h2>\n"
  html += "<div class='card'><label class='fl' style='display:block;margin-bottom:10px'>Investment mindset for your home technology design</label>"
  html += "<div class='budget-grid'>" + budgetOpts + "</div>"
  html += "<div class='field' style='margin-top:16px'><label class='fl'>When do you need the design completed?</label><input type='text' id='timeline' placeholder='e.g. Within 4 weeks / Before March 2027'/></div>"
  html += "<div class='field' style='margin-top:14px'><label class='fl'>Anything else you would like us to know?</label><textarea id='notes' rows='3' placeholder='Special requirements, priorities, concerns...'></textarea></div>"
  html += "</div>\n"

  html += "<div class='card' style='background:#fffbeb;border-color:#D97706'>"
  html += "<button class='submit-btn' onclick='ced_submit()'>Submit My Responses and Download Report</button>"
  html += "<div id='done-msg' class='done-msg'><div style='font-size:20px;margin-bottom:8px'>Thank you - your responses have been downloaded!</div><div style='font-size:14px;color:#4a4a4a'>Please email the downloaded file to <strong>" + cedEmail + "</strong> - your CED Africa designer will review it and contact you to confirm your consultation.</div></div>"
  html += "</div>\n"

  html += "<div style='text-align:center;margin-top:24px;font-size:12px;color:#aaa'>CED Africa - Customer Electronics Distribution Limited<br>17 Adeyemo Alakija St, Victoria Island, Lagos &middot; " + cedEmail + " &middot; " + cedPhone + " &middot; cedafrica.com<br>Discovery Ref: " + discId + "</div>\n"
  html += "</div>\n"

  html += "<script>\n"
  html += "document.addEventListener('change',function(e){if(e.target&&e.target.type==='checkbox'){var any=!!document.querySelector('input[name^=\"zone_\"][name$=\"_cinema\"]:checked');document.getElementById('cinema-card').style.display=any?'block':'none';document.getElementById('cinema-card').className=any?'card':'card cinema-card';}});\n"
  html += "function ced_submit(){\n"
  html += "var data={discId:'" + discId + "',clientName:document.getElementById('ownerName').value||'" + clientName + "',projName:document.getElementById('projName').value||'" + projName + "',address:document.getElementById('address').value,ownerEmail:document.getElementById('ownerEmail').value,ownerWhatsApp:document.getElementById('ownerWhatsApp').value,archCompany:document.getElementById('archCompany').value,archContact:document.getElementById('archContact').value,archEmail:document.getElementById('archEmail').value,archPhone:document.getElementById('archPhone').value,propType:document.getElementById('propType').value,constructionStage:document.getElementById('constructionStage').value,bedrooms:document.getElementById('bedrooms').value,moveIn:document.getElementById('moveIn').value,lifestyle:Array.from(document.querySelectorAll('input[name=lifestyle]:checked')).map(function(e){return e.value}),techComfort:(document.querySelector('input[name=techComfort]:checked')||{}).value||'',whoOperates:(document.querySelector('input[name=whoOperates]:checked')||{}).value||'',systems:{},zones:{},cinemaRender:(document.querySelector('input[name=cinemaRender]:checked')||{}).value||'',smartHomeExp:(document.querySelector('input[name=smartHomeExp]:checked')||{}).value||'',knownSystems:[],systemPrefs:document.getElementById('systemPrefs').value,wishlist:document.getElementById('wishlist').value,budget:(document.querySelector('input[name=budget]:checked')||{}).value||'',timeline:document.getElementById('timeline').value,notes:document.getElementById('notes').value,submittedAt:new Date().toISOString()};\n"
  html += collectSystems
  html += collectZones
  html += collectKnown
  html += "var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='Discovery_'+(data.clientName||'Client').replace(/\\s+/g,'-')+'_" + discId + ".json';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);\n"
  html += "document.getElementById('done-msg').style.display='block';document.querySelector('.submit-btn').style.opacity='.5';document.querySelector('.submit-btn').disabled=true;\n"
  html += "}\n"
  html += "</script>\n"
  html += "</body></html>"
  return html
}


function buildPortalHTML(quote, calc, settings) {
  const proj = quote.proj||{}
  const cedEmail = settings.studioEmail||"design@ced.africa"
  const nf = n => "\u20a6"+Math.round(n).toLocaleString("en-NG")
  const hf = n => n.toFixed(1)+" hrs"
  const rate = settings.rate||80000

  const isSpecQ = quote.quoteType === "specifier"

  const hasCinRender = (quote.rooms||[]).some(r=>r.locType==="Home Cinema"&&r.cinRender)
  const stageRows = calc.stageList.map(st => {
    const isComp   = isSpecQ && st.id==="s1"
    const isUpsell = isSpecQ && st.id!=="s1"
    const dotColor = isUpsell ? "#d0cfc9" : st.color
    const dels = (PLAIN[st.id]||[]).map(d =>
      `<div style="margin-bottom:7px"><div style="font-size:12px;font-weight:600;color:${isUpsell?"#666":"#1a1a1a"}">\u2022 ${d.title}</div>`+
      `<div style="font-size:11px;color:${isUpsell?"#888":"#4a4a4a"};line-height:1.6;margin-left:12px;margin-top:1px">${d.plain}</div></div>`
    ).join("")
    const cinRenderDel = (st.id==="s1"&&hasCinRender)
      ? `<div style="margin-bottom:7px;padding:5px 8px;border-radius:5px;background:#8B5CF608;border:1px solid #8B5CF630"><div style="font-size:12px;font-weight:600;color:#7C3AED">\u2022 ${PLAIN_CINEMA_RENDER.title}</div><div style="font-size:11px;color:#4a4a4a;line-height:1.6;margin-left:12px;margin-top:1px">${PLAIN_CINEMA_RENDER.plain}</div></div>`
      : ""
    const badge = isComp
      ? `<span style="margin-left:8px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#8B5CF618;color:#7C3AED;border:1px solid #8B5CF650">\u2713 Complimentary</span>`
      : isUpsell
        ? `<span style="margin-left:8px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#f0ede8;color:#888;border:1px solid #d0cfc9">Available \u2014 Paid</span>`
        : (st.gate ? `<span style="margin-left:8px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:${st.color}18;color:${st.color};border:1px solid ${st.color}50">${st.gate}</span>` : "")
    const feeCell = isComp
      ? `<div style="font-size:12px;color:#888;text-decoration:line-through">${nf(st.fee)}</div><div style="font-size:13px;font-weight:700;color:#7C3AED">\u20a60 Complimentary</div>`
      : `<span style="font-size:14px;font-weight:700;color:${isUpsell?"#888":"#1a1a1a"}">${nf(st.fee)}</span>`
    return `<tr style="${isUpsell?"background:#f8f7f5":""}">
      <td style="padding:14px 16px;vertical-align:top;border-bottom:1px solid #e5e4e0">
        <div style="display:flex;gap:10px">
          <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;margin-top:4px"></div>
          <div>
            <div style="font-size:14px;font-weight:700;color:${isUpsell?"#888":"#1a1a1a"};margin-bottom:3px">Stage ${st.num} \u2014 ${st.name}${badge}</div>
            <div style="font-size:11px;color:#888;margin-bottom:${isUpsell?0:8}px">${st.sub}</div>
            ${dels+cinRenderDel}
          </div>
        </div>
      </td>
      <td style="padding:14px;text-align:center;font-size:14px;font-weight:700;color:${isUpsell?"#888":"#1a1a1a"};vertical-align:top;border-bottom:1px solid #e5e4e0">${hf(st.hours)}</td>
      <td style="padding:14px;text-align:center;font-size:12px;color:${isUpsell?"#aaa":"#4a4a4a"};vertical-align:top;border-bottom:1px solid #e5e4e0">${nf(rate)}/hr</td>
      <td style="padding:14px;text-align:right;vertical-align:top;border-bottom:1px solid #e5e4e0">${feeCell}</td></tr>`
  }).join("")

  const s4Row = isSpecQ ? `
    <tr><td colspan="4" style="padding:0"><div style="padding:4px 16px;background:#f0ede8;border-top:2px dashed #d0cfc9;font-size:11px;font-weight:700;color:#888;letter-spacing:.05em">STAGE 4 \u2014 AVAILABLE AS PAID ENGAGEMENT</div></td></tr>
    <tr style="background:#f8f7f5">
      <td style="padding:12px 16px;vertical-align:top;border-bottom:1px solid #e5e4e0">
        <div style="font-size:14px;font-weight:700;color:#888;margin-bottom:3px">Stage 04 \u2014 Project Delivery Governance<span style="margin-left:8px;font-size:10px;padding:2px 8px;border-radius:10px;background:#f0ede8;color:#888;border:1px solid #d0cfc9">Available \u2014 Paid</span></div>
        <div style="font-size:11px;color:#aaa;margin-bottom:8px">Experience Delivery Governance \u00b7 Monthly Retainer from onsite kick-off</div>
        ${PLAIN_S4.map(d=>`<div style="margin-bottom:6px"><div style="font-size:12px;font-weight:600;color:#666">\u2022 ${d.title}</div><div style="font-size:11px;color:#888;line-height:1.6;margin-left:12px;margin-top:1px">${d.plain}</div></div>`).join("")}
      </td>
      <td style="padding:12px;text-align:center;font-size:13px;color:#888;vertical-align:top;border-bottom:1px solid #e5e4e0">\u2014</td>
      <td style="padding:12px;text-align:center;font-size:12px;color:#aaa;vertical-align:top;border-bottom:1px solid #e5e4e0">${nf(rate)}/hr</td>
      <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600;color:#888;vertical-align:top;border-bottom:1px solid #e5e4e0">${nf(calc.s4Monthly)}/mo</td>
    </tr>` :
    quote.cfg?.s4Included ? `<tr style="background:#fffbf0"><td style="padding:14px 16px;vertical-align:top;border-bottom:1px solid #e5e4e0">
      <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:5px">Stage 04 \u2014 Project Delivery Governance
      <span style="margin-left:8px;font-size:11px;padding:2px 7px;border-radius:4px;background:#D9770620;color:#D97706;font-weight:700">RETAINER</span></div>
      ${PLAIN_S4.map(d=>`<div style="margin-bottom:6px"><div style="font-size:12px;font-weight:600;color:#1a1a1a">\u2022 ${d.title}</div><div style="font-size:11px;color:#4a4a4a;line-height:1.6;margin-left:12px;margin-top:1px">${d.plain}</div></div>`).join("")}
      </td><td style="padding:14px;text-align:center;font-size:13px;color:#4a4a4a;vertical-align:top">${quote.cfg.s4Months} months</td>
      <td style="padding:14px;text-align:center;font-size:12px;color:#4a4a4a;vertical-align:top">${nf(calc.s4Monthly)}/mo</td>
      <td style="padding:14px;text-align:right;font-size:14px;font-weight:700;color:#D97706;vertical-align:top">${nf(calc.s4Total)}</td></tr>` : ""

  const totalsRow = isSpecQ
    ? `<tr style="background:#8B5CF608;border-top:2px solid #8B5CF6">
        <td style="padding:12px 16px"><div style="font-size:13px;font-weight:700;color:#5B21B6">Stage 1 \u2014 Complimentary (Amount Invoiced)</div><div style="font-size:11px;color:#7C3AED;margin-top:2px">Stages 2, 3 &amp; 4 shown above are available as paid engagements</div></td>
        <td style="padding:12px;text-align:center;font-size:13px;font-weight:700;color:#5B21B6">${hf(calc.stageHrs.s1||0)}</td>
        <td></td>
        <td style="padding:12px 16px;text-align:right;font-size:15px;font-weight:700;color:#7C3AED">\u20a60</td>
      </tr>`
    : `<tr style="background:#f8f7f5;border-top:2px solid #d0cfc9">
        <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#1a1a1a">Stages 1\u20133 Total (excl. VAT)</td>
        <td style="padding:12px;text-align:center;font-size:14px;font-weight:700;color:#1a1a1a">${hf(calc.totalH)}</td><td></td>
        <td style="padding:12px 16px;text-align:right;font-size:14px;font-weight:700;color:#1a1a1a">${nf(calc.subtotal)}</td>
      </tr>`

  const excl = (settings.exclusions||[]).map((e,i)=>`<div>${i+1}. ${e}</div>`).join("")
  const sh = [proj.ownerName&&proj.ownerEmail?`<div><b>Project Owner:</b> ${proj.ownerName} \u00b7 ${proj.ownerEmail}${proj.ownerPhone?" \u00b7 "+proj.ownerPhone:""}</div>`:"",
    proj.archCompany?`<div><b>Architect:</b> ${proj.archCompany}${proj.archContact?" \u2014 "+proj.archContact:""}${proj.archEmail?" \u00b7 "+proj.archEmail:""}</div>`:"",
    proj.mepCompany?`<div><b>MEP Consultant:</b> ${proj.mepCompany}${proj.mepContact?" \u2014 "+proj.mepContact:""}${proj.mepEmail?" \u00b7 "+proj.mepEmail:""}</div>`:""].filter(Boolean).join("")


  // ── Date for signature ────────────────────────────────
  const today  = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})
  const cedContact = settings.studioEmail||"design@ced.africa"

  
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${(quote.ref||"CED-REF").replace(/[\/]/g,"-")}_Client_${(quote.projectName||"Project").replace(/\s+/g,"-").replace(/[^a-zA-Z0-9-]/g,"")}_v${quote.version||1}_${new Date().toISOString().slice(0,10).replace(/-/g,"")}_Signed</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#f8f7f5;font-size:13px;line-height:1.5;-webkit-text-size-adjust:100%}

/* ── Layout ── */
.toolbar{background:#1a1a1a;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100;flex-wrap:wrap;gap:8px}
.toolbar-logo{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.toolbar-actions{display:flex;gap:8px;flex-wrap:wrap}
.page{max-width:920px;margin:0 auto;padding:32px 24px;background:#fff}

/* ── Components ── */
table{width:100%;border-collapse:collapse}
.card{border:1px solid #d0cfc9;border-radius:10px;overflow:hidden;margin-bottom:20px}
.hl{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px}

/* ── Responsive grids ── */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
.grid-fee{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}

/* ── Stage table responsive ── */
.stage-table td:nth-child(2),.stage-table th:nth-child(2),
.stage-table td:nth-child(3),.stage-table th:nth-child(3){white-space:nowrap}

/* ── Sign panel ── */
.sign-panel{border:2px solid #D97706;border-radius:14px;padding:24px;margin-bottom:24px;text-align:center}
.sign-panel input{width:100%;max-width:420px;padding:10px 14px;border:2px solid #d0cfc9;border-radius:8px;font-size:16px;font-family:Georgia,serif;margin:10px 0;display:block;margin-left:auto;margin-right:auto}
.sign-panel input:focus{outline:none;border-color:#D97706}
.sign-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:10px}
.sign-btn{padding:12px 22px;border-radius:8px;font-size:14px;font-weight:700;border:none;cursor:pointer;min-width:160px}
.signed-box{display:none;margin-top:12px;padding:14px 20px;border:2px solid #16A34A;border-radius:8px;background:#f0fdf4;text-align:left}

/* ── Mobile ── */
@media(max-width:600px){
  .toolbar{padding:10px 14px}
  .toolbar-logo span{display:none}
  .page{padding:20px 14px}
  .grid-2,.grid-fee{grid-template-columns:1fr}
  .grid-3{grid-template-columns:1fr}
  .sign-btn{min-width:100%;font-size:13px;padding:12px 16px}
  .stage-table{font-size:12px}
  .stage-table td:nth-child(2),.stage-table th:nth-child(2),
  .stage-table td:nth-child(3),.stage-table th:nth-child(3){display:none}
  .stage-table td:last-child,.stage-table th:last-child{white-space:nowrap}
  .card{border-radius:8px}
  h1{font-size:22px!important}
  .hero-meta{flex-direction:column;gap:6px!important}
}
@media(max-width:400px){
  body{font-size:12px}
  .page{padding:16px 10px}
}

/* ── Print ── */
@media print{
  .toolbar{display:none!important}
  .sign-panel input{display:none!important}
  .sign-btn{display:none!important}
  .sign-hint{display:none!important}
  .signed-box{display:none!important}
  .signed-box.active{display:block!important;border:2px solid #16A34A}
  body{background:#fff}
  .page{padding:20px 28px}
  .grid-2,.grid-fee{grid-template-columns:1fr 1fr!important}
  .grid-3{grid-template-columns:repeat(3,1fr)!important}
  .stage-table td:nth-child(2),.stage-table th:nth-child(2),
  .stage-table td:nth-child(3),.stage-table th:nth-child(3){display:table-cell!important}
}
</style></head><body>
<div class="toolbar">
  <div class="toolbar-logo">
    <div style="background:#D97706;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;letter-spacing:.07em">CED AFRICA</div>
    <span style="color:#aaa;font-size:13px">Design Services Quotation \u00b7 ${quote.ref}</span>
  </div>
  <button onclick="window.print()" style="padding:8px 20px;border-radius:7px;border:none;background:#D97706;color:#fff;font-size:13px;cursor:pointer;font-weight:600">\uD83D\uDDA8 Save as PDF</button>
</div>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #e5e4e0">
    <div><div style="font-size:11px;color:#D97706;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px">CED Africa \u2014 AV Consulting Design Services</div>
    <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:3px">Design Services Quotation</h1>
    <div style="font-size:13px;color:#4a4a4a">Residential Home Technology System</div></div>
    <div style="text-align:right"><div style="font-size:24px;font-weight:700;color:#1a1a1a">QUOTATION</div>
    <div style="font-size:13px;color:#888;margin-top:3px">${quote.ref}</div><div style="font-size:13px;color:#888">${proj.date||""}</div></div>
  </div>
  <div class="grid-2">
    <div><div class="hl">Prepared For</div><div style="font-size:16px;font-weight:700;color:#1a1a1a">${proj.client||"\u2014"}</div>
    ${proj.address?`<div style="font-size:13px;color:#4a4a4a;margin-top:3px">${proj.address}</div>`:""}
    ${sh?`<div style="font-size:12px;color:#888;margin-top:8px;line-height:1.8">${sh}</div>`:""}</div>
    <div><div class="hl">Project Details</div><div style="font-size:16px;font-weight:700;color:#1a1a1a">${proj.name||"\u2014"}</div>
    ${proj.designer?`<div style="font-size:12px;color:#888;margin-top:3px">Prepared by: ${proj.designer}</div>`:""}</div>
  </div>
  <div class="grid-3">
    ${[["Total Design Hours",hf(calc.totalH),"#1a1a1a"],["Design Fee (excl. VAT)",nf(calc.subtotal),"#1a1a1a"],["Stages 1\u20133 Grand Total (inc. VAT)",nf(calc.grand),"#D97706"]].map(([l,v,c])=>
    `<div style="border:1px solid #d0cfc9;border-radius:10px;padding:16px;text-align:center"><div style="font-size:${l.includes("Grand")?20:18}px;font-weight:700;color:${c}">${v}</div><div style="font-size:12px;color:#888;margin-top:4px">${l}</div></div>`).join("")}
  </div>
  <div class="hl">Design Stage Breakdown &amp; Deliverables</div>
  <div class="card"><table class="stage-table">
    <thead><tr style="background:#f8f7f5">
      <th style="padding:10px 16px;font-size:12px;font-weight:700;color:#4a4a4a;text-align:left;border-bottom:1px solid #d0cfc9">Stage / Deliverables &amp; Description</th>
      <th style="padding:10px;font-size:12px;font-weight:700;color:#4a4a4a;text-align:center;border-bottom:1px solid #d0cfc9;width:80px">Hours</th>
      <th style="padding:10px;font-size:12px;font-weight:700;color:#4a4a4a;text-align:center;border-bottom:1px solid #d0cfc9;width:110px">Rate/hr</th>
      <th style="padding:10px 16px;font-size:12px;font-weight:700;color:#4a4a4a;text-align:right;border-bottom:1px solid #d0cfc9;width:130px">Stage Fee</th>
    </tr></thead>
    <tbody>${stageRows}${s4Row}${totalsRow}</tbody>
  </table></div>
  <div class="grid-fee">
    ${isSpecQ ? `
    <div class="card" style="padding:18px"><div class="hl">Specifier Fee Summary</div>
      <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:13px;color:#4a4a4a">Stage 1 Design Fee</span><span style="font-size:13px;color:#888;text-decoration:line-through">${nf(calc.s1Fee||0)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:13px;color:#4a4a4a">Professional Courtesy Discount</span><span style="font-size:13px;font-weight:600;color:#7C3AED">100%</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #8B5CF6;margin-top:5px"><span style="font-size:14px;font-weight:700;color:#5B21B6">Amount Invoiced</span><span style="font-size:16px;font-weight:700;color:#7C3AED">\u20a60</span></div>

    </div>
    <div class="card" style="padding:18px"><div class="hl">Paid Engagement Indicative Fees</div>
      <div style="font-size:12px;color:#4a4a4a;margin-bottom:10px;line-height:1.5">Should you wish to proceed with full CED Africa AV Consulting Design Services for your end-client:</div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e4e0"><span style="font-size:12px;color:#4a4a4a">Stage 2 \u2014 Site Pack</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">${nf(calc.stageList.find(s=>s.id==="s2")?.fee||0)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e4e0"><span style="font-size:12px;color:#4a4a4a">Stage 3 \u2014 Engineering Pack</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">${nf(calc.stageList.find(s=>s.id==="s3")?.fee||0)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="font-size:12px;color:#4a4a4a">Stage 4 \u2014 Delivery Governance</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">${nf(calc.s4Monthly)}/mo</span></div>
      <div style="font-size:11px;color:#888;margin-top:8px;line-height:1.5">All fees excl. VAT 7.5%. Stages 2 &amp; 3: 50% advance + 50% on delivery. Stage 4: prepaid monthly from onsite kick-off.</div>
    </div>` : `
    <div class="card" style="padding:18px"><div class="hl">Fee Summary</div>
      <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:13px;color:#4a4a4a">Design Fee (excl. VAT)</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">${nf(calc.subtotal)}</span></div>
      ${quote.cfg?.discount>0?`<div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:13px;color:#4a4a4a">Discount (${quote.cfg.discount}%)</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">\u2013 ${nf(calc.discAmt)}</span></div>`:""}
      <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:13px;color:#4a4a4a">VAT (7.5%)</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">${nf(calc.vatAmt)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #d0cfc9;margin-top:5px"><span style="font-size:14px;font-weight:700;color:#1a1a1a">Stages 1\u20133 Grand Total</span><span style="font-size:16px;font-weight:700;color:#D97706">${nf(calc.grand)}</span></div>
      ${quote.cfg?.s4Included?`<div style="margin-top:10px;padding:8px 12px;border-radius:6px;background:#D9770612;border:1px dashed #D97706;font-size:12px;color:#92400E">Stage 4 optional retainer: ${nf(calc.s4Monthly)}/mo \u2014 not included above</div>`:""}
    </div>
    <div class="card" style="padding:18px"><div class="hl">Payment Schedule</div>
      <div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:#4a4a4a">50% Advance</span><span style="font-size:14px;font-weight:700;color:#1a1a1a">${nf(calc.grand*0.5)}</span></div><div style="font-size:11px;color:#888;margin-top:2px">Due to commence design work</div></div>
      <div><div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:#4a4a4a">50% Balance</span><span style="font-size:14px;font-weight:700;color:#1a1a1a">${nf(calc.grand*0.5)}</span></div><div style="font-size:11px;color:#888;margin-top:2px">Due on delivery of documentation</div></div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e4e0"><div class="hl">Payment Information</div>
        <div style="font-size:12px;color:#4a4a4a;line-height:1.8"><b>USD:</b> Custom Electronics Distribution \u00b7 Standard Chartered \u00b7 A/C: 0005866571<br><b>NGN:</b> Custom Electronics Distribution \u00b7 Access Bank \u00b7 A/C: 0073984770</div>
      </div>
    </div>`}
  </div>
  <div class="card" style="padding:18px;margin-bottom:24px"><div class="hl">Terms &amp; Conditions</div>
    <div style="font-size:12px;color:#4a4a4a;line-height:1.8;margin-bottom:10px">
      <div>1. This quotation is valid for 30 days from the date of issue.</div>
      <div>2. All fees are quoted in NGN. VAT at 7.5% applies to all design fees.</div>
      <div>3. Design work commences upon receipt of 50% advance payment and signed Design Services Agreement.</div>
      <div>4. Scope changes after Stage 1 sign-off require a formal Variation Order.</div>
      <div>5. CED Africa retains intellectual ownership of all documents until final payment.</div>
    </div>
    ${excl?`<div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Standard Exclusions</div><div style="font-size:12px;color:#4a4a4a;line-height:1.8">${excl}</div>`:""}
  </div>

  <div class="sign-panel">
    <div style="font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Client Sign-Off</div>
    <div style="font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:6px">${proj.ownerName?"Dear "+proj.ownerName+", sign":"Sign"} to accept this quotation</div>
    <div style="font-size:13px;color:#4a4a4a;margin-bottom:18px;line-height:1.6">
      <strong>Step 1:</strong> Type your full legal name in the field below.<br>
      <strong>Step 2:</strong> Click your preferred acceptance option — the signed PDF will open automatically.<br>
      Email the signed PDF to <strong>${cedContact}</strong> to confirm acceptance.
    </div>

    <div style="text-align:center;margin-bottom:16px">
      <input id="ced_sig" type="text" placeholder="Type your full legal name here to sign..."
        oninput="document.getElementById('ced_sig_display').textContent=this.value;document.getElementById('ced_sig_display2').textContent=this.value;document.getElementById('ced_sig_display3').textContent=this.value"/>
    </div>

    ${quote.cfg?.s4Included?`
    <div class="sign-btns">
      <button onclick="ced_sign('with')" class="sign-btn"
        style="padding:11px 24px;background:#16A34A;color:#fff;border-radius:8px;font-size:14px;font-weight:700;border:none;cursor:pointer">
        &#x2713; Accept &mdash; Including Stage 4
      </button>
      <button onclick="ced_sign('without')" class="sign-btn"
        style="padding:11px 24px;background:#1a1a1a;color:#fff;border-radius:8px;font-size:14px;font-weight:700;border:none;cursor:pointer">
        &#x2713; Accept &mdash; Stages 1&ndash;3 Only
      </button>
    </div>
    <div style="font-size:11px;color:#666;margin-bottom:10px" class="sign-hint">Both options accept the Stages 1&ndash;3 fee. The first also confirms Stage 4.</div>
    `:`
    <div style="text-align:center;margin-bottom:10px">
      <button onclick="ced_sign('std')" class="sign-btn"
        style="padding:13px 36px;background:#16A34A;color:#fff;border-radius:8px;font-size:15px;font-weight:700;border:none;cursor:pointer">
        &#x2713; Accept This Quotation
      </button>
    </div>
    `}

    <div id="ced_signed_with" class="signed-box" style="display:none">
      <div style="font-size:11px;color:#16A34A;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">&#x2713; Signed &mdash; Acceptance Incl. Stage 4</div>
      <div style="font-size:15px;font-family:Georgia,serif;color:#1a1a1a;margin-bottom:6px" id="ced_sig_display"></div>
      <div style="font-size:12px;color:#888">${today} &nbsp;&middot;&nbsp; Ref: ${quote.ref}</div>
      <div style="font-size:12px;color:#4a4a4a;margin-top:8px;line-height:1.6">
        I confirm acceptance of this AV Design Services Quotation including Stage 4 Project Delivery Governance.<br>
        Fee: ${nf(calc.grand)} (inc. VAT) &nbsp;+&nbsp; Stage 4 retainer ${nf(calc.s4Monthly)}/month.<br>
        I have read and agree to all terms, conditions and exclusions.
      </div>
    </div>

    <div id="ced_signed_without" class="signed-box" style="display:none">
      <div style="font-size:11px;color:#16A34A;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">&#x2713; Signed &mdash; Acceptance Stages 1&ndash;3 Only</div>
      <div style="font-size:15px;font-family:Georgia,serif;color:#1a1a1a;margin-bottom:6px" id="ced_sig_display2"></div>
      <div style="font-size:12px;color:#888">${today} &nbsp;&middot;&nbsp; Ref: ${quote.ref}</div>
      <div style="font-size:12px;color:#4a4a4a;margin-top:8px;line-height:1.6">
        I confirm acceptance of this AV Design Services Quotation (Stages 1&ndash;3).<br>
        Grand Total: ${nf(calc.grand)} (inc. VAT). Stage 4 not included.<br>
        I have read and agree to all terms, conditions and exclusions.
      </div>
    </div>

    <div id="ced_signed_std" class="signed-box" style="display:none">
      <div style="font-size:11px;color:#16A34A;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">&#x2713; Signed &mdash; Quotation Accepted</div>
      <div style="font-size:15px;font-family:Georgia,serif;color:#1a1a1a;margin-bottom:6px" id="ced_sig_display3"></div>
      <div style="font-size:12px;color:#888">${today} &nbsp;&middot;&nbsp; Ref: ${quote.ref}</div>
      <div style="font-size:12px;color:#4a4a4a;margin-top:8px;line-height:1.6">
        I confirm acceptance of this AV Design Services Quotation.<br>
        Grand Total: ${nf(calc.grand)} (inc. VAT).<br>
        I have read and agree to all terms, conditions and exclusions.
      </div>
    </div>

    <script>
    function ced_sign(type){
      var name=document.getElementById('ced_sig').value.trim();
      if(!name){document.getElementById('ced_sig').style.borderColor='#ef4444';document.getElementById('ced_sig').placeholder='Please type your full name first';return;}
      document.getElementById('ced_sig').style.borderColor='#16A34A';
      var ids=['ced_signed_with','ced_signed_without','ced_signed_std'];
      ids.forEach(function(id){var el=document.getElementById(id);el.style.display='none';el.classList.remove('active');});
      var active=null;
      if(type==='with'){document.getElementById('ced_sig_display').textContent=name;active=document.getElementById('ced_signed_with');}
      else if(type==='without'){document.getElementById('ced_sig_display2').textContent=name;active=document.getElementById('ced_signed_without');}
      else{document.getElementById('ced_sig_display3').textContent=name;active=document.getElementById('ced_signed_std');}
      active.style.display='block';active.classList.add('active');
      setTimeout(function(){window.print();},400);
    }
    </script>

    <div style="margin-top:16px;font-size:11px;color:#aaa;text-align:center">
      Email the signed PDF to: <strong>${cedContact}</strong> &nbsp;&middot;&nbsp; 0808 666 2168
    </div>
  </div>
  <div style="text-align:center;font-size:11px;color:#aaa;padding-bottom:20px">
    <div style="font-weight:600;color:#888;margin-bottom:3px">CED Africa \u2014 Customer Electronics Distribution Limited</div>
    <div>17 Adeyemo Alakija St, Victoria Island, Lagos 101241 \u00b7 0808 666 2168 \u00b7 cedafrica.com</div>
    <div style="margin-top:4px">Ref: ${quote.ref}</div>
  </div>
</div></body></html>`
}


function buildQuoteHTML(quote, calc, settings, currency="NGN", usdRate=1600) {
  const hasCinRender = (quote.rooms||[]).some(r=>r.locType==="Home Cinema"&&r.cinRender)
  const portalToken = quote.clientToken||""
  const portalURL = portalToken ? (window.location.href.split("#")[0]+"#portal/"+portalToken) : ""
  const fmtH = n => currency==="USD" ? "$"+Math.round(n/usdRate).toLocaleString("en-US") : "₦"+Math.round(n).toLocaleString("en-NG")
  const rateLabel = currency==="USD" ? `$${Math.round((settings.rate||80000)/usdRate)}/hr` : `₦${(settings.rate||80000).toLocaleString("en-NG")}/hr`
  const currencyNote = currency==="USD" ? `<div style="font-size:11px;color:#888;margin-top:6px;padding-top:6px;border-top:1px solid #e5e4e0">All amounts in USD · Exchange rate: ₦${usdRate.toLocaleString("en-NG")} per $1 USD · NGN Grand Total: ₦${Math.round(calc.grand).toLocaleString("en-NG")}</div>` : ""
  const {proj,cfg} = quote
  const excl = (settings.exclusions||DEF_EXCLUSIONS).map((e,i)=>`<div>${i+1}. ${e}</div>`).join("")
  const locs = [...new Set((quote.rooms||[]).filter(r=>r.locType).map(r=>r.locType))]
  const tiers = settings.sizeTiers||DEF_SIZE_TIERS

  const byType = {}
  ;(quote.rooms||[]).filter(r=>r.locType).forEach(r=>{
    if(!byType[r.locType])byType[r.locType]={count:0,sqms:[]}
    byType[r.locType].count++
    if(r.sqm)byType[r.locType].sqms.push(parseFloat(r.sqm))
  })

  const locTags = locs.map(lt=>{
    const avg = byType[lt].sqms.length>0?byType[lt].sqms.reduce((a,b)=>a+b,0)/byType[lt].sqms.length:0
    const tier = avg?getSizeTier(avg,tiers):""
    return `<span style="display:inline-block;padding:4px 10px;border-radius:5px;font-size:12px;background:#D9770618;border:1px solid #D9770640;margin:2px">${lt} ×${byType[lt].count}${tier?` <span style="color:#D97706;font-size:9px">${tier}</span>`:""}</span>`
  }).join("")

  const isSpecifierQ = quote.quoteType === "specifier"
  const ngnFmtH = n => "₦"+Math.round(n).toLocaleString("en-NG")

  const stageRows = calc.stageList.map(st=>{
    const isComp   = isSpecifierQ && st.id==="s1"
    const isUpsell = isSpecifierQ && st.id!=="s1"
    const dotColor = isUpsell ? "#d0cfc9" : st.color
    const deliverables = isUpsell ? "" :
      (PLAIN[st.id]||[]).map(d=>`<div style="margin-bottom:8px"><div style="font-size:12px;font-weight:600;color:#1a1a1a">• ${d.title}</div><div style="font-size:11px;color:#4a4a4a;line-height:1.5;margin-left:12px;margin-top:2px">${d.plain}</div></div>`).join("")
    const cinRenderDel = (st.id==="s1"&&hasCinRender)
      ? `<div style="margin-bottom:8px;padding:5px 8px;border-radius:5px;background:#8B5CF608;border:1px solid #8B5CF630"><div style="font-size:12px;font-weight:600;color:#7C3AED">&#x2022; ${PLAIN_CINEMA_RENDER.title}</div><div style="font-size:11px;color:#4a4a4a;line-height:1.5;margin-left:12px;margin-top:2px">${PLAIN_CINEMA_RENDER.plain}</div></div>`
      : ""
    const badge = isComp
      ? `<span style="margin-left:8px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#8B5CF618;color:#7C3AED;border:1px solid #8B5CF650">✓ Complimentary</span>`
      : isUpsell
        ? `<span style="margin-left:8px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:#f0ede8;color:#888;border:1px solid #d0cfc9">Available — Paid</span>`
        : (st.gate ? `<span style="margin-left:8px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:${st.color}18;color:${st.color};border:1px solid ${st.color}50">${st.gate}</span>` : "")
    const feeCell = isComp
      ? `<div style="font-size:12px;color:#888;text-decoration:line-through">${ngnFmtH(st.fee)}</div><div style="font-size:13px;font-weight:700;color:#7C3AED">₦0 Complimentary</div>`
      : `<span style="font-size:14px;font-weight:700;color:${isUpsell?"#888":"#1a1a1a"}">${fmtH(st.fee)}</span>`
    return `<tr style="${isUpsell?"background:#f8f7f5":""}">
      <td style="padding:14px 16px;vertical-align:top;border-bottom:1px solid #e5e4e0">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0;margin-top:4px"></div>
          <div>
            <div style="font-size:14px;font-weight:700;color:${isUpsell?"#888":"#1a1a1a"};margin-bottom:3px">Stage ${st.num} — ${st.name}${badge}</div>
            <div style="font-size:11px;color:#888;margin-bottom:${isUpsell?0:10}px">${st.sub}</div>
            ${deliverables+cinRenderDel}
          </div>
        </div>
      </td>
      <td style="padding:14px;text-align:center;font-size:14px;font-weight:700;color:${isUpsell?"#888":"#1a1a1a"};vertical-align:top;border-bottom:1px solid #e5e4e0">${hrs(st.hours)}</td>
      <td style="padding:14px;text-align:center;font-size:12px;color:${isUpsell?"#aaa":"#4a4a4a"};vertical-align:top;border-bottom:1px solid #e5e4e0">${rateLabel}</td>
      <td style="padding:14px;text-align:right;vertical-align:top;border-bottom:1px solid #e5e4e0">${feeCell}</td>
    </tr>`
  }).join("")

  const s4Row = isSpecifierQ ? `
    <tr><td colspan="4" style="padding:0"><div style="padding:4px 16px;background:#f0ede8;border-top:2px dashed #d0cfc9;font-size:11px;font-weight:700;color:#888;letter-spacing:.05em">STAGE 4 — AVAILABLE AS PAID ENGAGEMENT</div></td></tr>
    <tr style="background:#f8f7f5">
      <td style="padding:12px 16px;vertical-align:top;border-bottom:1px solid #e5e4e0">
        <div style="font-size:14px;font-weight:700;color:#888;margin-bottom:3px">Stage 04 — Project Delivery Governance<span style="margin-left:8px;font-size:10px;padding:2px 8px;border-radius:10px;background:#f0ede8;color:#888;border:1px solid #d0cfc9">Available — Paid</span></div>
        <div style="font-size:11px;color:#aaa">Experience Delivery Governance · Monthly Retainer from onsite kick-off</div>
      </td>
      <td style="padding:12px;text-align:center;font-size:13px;color:#888;vertical-align:top;border-bottom:1px solid #e5e4e0">—</td>
      <td style="padding:12px;text-align:center;font-size:12px;color:#aaa;vertical-align:top;border-bottom:1px solid #e5e4e0">${rateLabel}</td>
      <td style="padding:12px 16px;text-align:right;font-size:13px;font-weight:600;color:#888;vertical-align:top;border-bottom:1px solid #e5e4e0">${ngnFmtH(calc.s4Monthly)}/mo</td>
    </tr>` : ""

  const totalsRow = isSpecifierQ
    ? `<tr style="background:#8B5CF608;border-top:2px solid #8B5CF6">
        <td style="padding:12px 16px"><div style="font-size:13px;font-weight:700;color:#5B21B6">Stage 1 — Complimentary (Amount Invoiced)</div><div style="font-size:11px;color:#7C3AED;margin-top:2px">Stages 2, 3 &amp; 4 shown above are available as paid engagements</div></td>
        <td style="padding:12px;text-align:center;font-size:13px;font-weight:700;color:#5B21B6">${hrs(calc.stageHrs.s1||0)}</td>
        <td></td>
        <td style="padding:12px 16px;text-align:right;font-size:15px;font-weight:700;color:#7C3AED">₦0</td>
      </tr>`
    : `<tr style="background:#f8f7f5;border-top:2px solid #d0cfc9"><td style="padding:12px 16px;font-size:14px;font-weight:700;color:#1a1a1a">Stages 1–3 Total</td><td style="padding:12px;text-align:center;font-size:14px;font-weight:700;color:#1a1a1a">${hrs(calc.totalH)}</td><td></td><td style="padding:12px 16px;text-align:right;font-size:14px;font-weight:700;color:#1a1a1a">${fmtH(calc.subtotal)}</td></tr>`

  const feeSummaryHTML = isSpecifierQ ? `
  <div class="card" style="padding:18px">
    <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Specifier Fee Summary</div>
    <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:13px;color:#4a4a4a">Stage 1 Design Fee</span><span style="font-size:13px;color:#888;text-decoration:line-through">${ngnFmtH(calc.s1Fee||0)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:13px;color:#4a4a4a">Professional Courtesy Discount</span><span style="font-size:13px;font-weight:600;color:#7C3AED">100%</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #8B5CF6;margin-top:5px"><span style="font-size:14px;font-weight:700;color:#5B21B6">Amount Invoiced</span><span style="font-size:16px;font-weight:700;color:#7C3AED">₦0</span></div>
    <div style="margin-top:10px;padding:8px 10px;border-radius:7px;background:#8B5CF608;border:1px dashed #8B5CF640">
      <div style="font-size:11px;font-weight:700;color:#7C3AED;margin-bottom:4px">Studio Internal Cost (Unbillable)</div>
      <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:#888">Stage 1 hrs × rate</span><span style="font-size:12px;font-weight:600;color:#7C3AED">${ngnFmtH(calc.s1Fee||0)}</span></div>
    </div>
  </div>
  <div class="card" style="padding:18px">
    <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Paid Engagement Indicative Fees</div>
    <div style="font-size:12px;color:#4a4a4a;margin-bottom:10px;line-height:1.5">Should the specifier proceed with full CED Africa AV Consulting Design Services for their end-client, the following fees apply:</div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e4e0"><span style="font-size:12px;color:#4a4a4a">Stage 2 — Site Pack</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">${ngnFmtH(calc.stageList.find(s=>s.id==="s2")?.fee||0)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e4e0"><span style="font-size:12px;color:#4a4a4a">Stage 3 — Engineering Pack</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">${ngnFmtH(calc.stageList.find(s=>s.id==="s3")?.fee||0)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0"><span style="font-size:12px;color:#4a4a4a">Stage 4 — Delivery Governance</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">${ngnFmtH(calc.s4Monthly)}/mo</span></div>
    <div style="font-size:11px;color:#888;margin-top:8px;line-height:1.5">All fees excl. VAT 7.5%. Stages 2 &amp; 3: 50% advance + 50% on delivery. Stage 4: prepaid monthly from onsite kick-off.</div>
  </div>` : `<div class="card" style="padding:18px"><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Fee Summary</div>
    <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:13px;color:#4a4a4a">Design Fee (excl. VAT)</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">${fmtH(calc.subtotal)}</span></div>
    ${cfg?.discount>0?`<div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:13px;color:#4a4a4a">Discount (${cfg.discount}%)</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">– ${fmtH(calc.discAmt)}</span></div>`:""}
    <div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:13px;color:#4a4a4a">VAT (7.5%)</span><span style="font-size:13px;font-weight:600;color:#1a1a1a">${fmtH(calc.vatAmt)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #d0cfc9;margin-top:5px"><span style="font-size:14px;font-weight:700;color:#1a1a1a">Grand Total</span><span style="font-size:16px;font-weight:700;color:#D97706">${fmtH(calc.grand)}</span></div>${currencyNote}</div>
  <div class="card" style="padding:18px"><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Payment Schedule</div>
    <div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:#4a4a4a">50% Advance Payment</span><span style="font-size:14px;font-weight:700;color:#1a1a1a">${fmtH(calc.grand*0.5)}</span></div><div style="font-size:11px;color:#888;margin-top:2px">Due to commence design work</div></div>
    <div><div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:#4a4a4a">50% Balance Payment</span><span style="font-size:14px;font-weight:700;color:#1a1a1a">${fmtH(calc.grand*0.5)}</span></div><div style="font-size:11px;color:#888;margin-top:2px">Due on delivery of documentation</div></div></div>`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>CED Quote — ${proj?.name||""} — ${quote.ref}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#f8f7f5;font-size:13px;line-height:1.5}
.page{max-width:900px;margin:0 auto;padding:40px 32px;background:#fff}
table{width:100%;border-collapse:collapse}
.card{border:1px solid #d0cfc9;border-radius:10px;overflow:hidden}
.toolbar{background:#1a1a1a;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100}
.portal-banner{margin:0 0 24px;padding:20px 24px;border-radius:12px;background:#fffbeb;border:2px solid #D97706;text-align:center}
.portal-btn{display:inline-block;padding:13px 36px;background:#D97706;color:#fff;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;margin:10px 0 4px}
@media print{.toolbar{display:none!important}.portal-banner{display:none!important}body{background:#fff}.page{padding:20px 32px}}
</style>
</head><body>
<div class="toolbar">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="background:#D97706;color:#fff;font-size:11px;font-weight:700;padding:3px 9px;border-radius:4px;letter-spacing:.07em">CED AFRICA</div>
    <span style="color:#aaa;font-size:13px">Design Services Quotation · ${quote.ref}</span>
  </div>
  <button onclick="window.print()" style="padding:8px 18px;border-radius:7px;border:none;background:#D97706;color:#fff;font-size:13px;cursor:pointer;font-weight:600">🖨 Save as PDF</button>
</div>
<div class="page">
${portalURL&&quote.status==="sent"?`
<div class="portal-banner">
  <div style="font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Action Required</div>
  <div style="font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:6px">Please review and respond to this quotation</div>
  <div style="font-size:13px;color:#4a4a4a;margin-bottom:14px;line-height:1.6">Click below to accept or decline. Your response is instantly recorded and notifies the CED Africa Design Studio.</div>
  <a href="${portalURL}" class="portal-btn">✓ Open Quotation Portal — Accept or Decline →</a>
  <div style="font-size:11px;color:#888;margin-top:10px">Or copy: <span style="color:#D97706">${portalURL}</span></div>
</div>`:""}
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #e5e4e0">
  <div><div style="display:inline-block;background:#D97706;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;letter-spacing:.07em;margin-bottom:8px">CED AFRICA</div>
  <h1 style="font-size:22px;font-weight:700;color:#1a1a1a">Design Services Quotation</h1>
  <div style="font-size:13px;color:#4a4a4a;margin-top:4px">Residential Home Technology System</div></div>
  <div style="text-align:right"><div style="font-size:26px;font-weight:700;color:#1a1a1a">QUOTATION</div><div style="font-size:13px;color:#888;margin-top:3px">${quote.ref}</div><div style="font-size:13px;color:#888">${proj?.date||""}</div></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
  <div><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Prepared For</div><div style="font-size:16px;font-weight:700;color:#1a1a1a">${proj?.client||"—"}</div>${proj?.address?`<div style="font-size:13px;color:#4a4a4a;margin-top:3px">${proj.address}</div>`:""}</div>
  <div><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Project</div><div style="font-size:16px;font-weight:700;color:#1a1a1a">${proj?.name||"—"}</div>${proj?.designer?`<div style="font-size:12px;color:#888;margin-top:3px">Prepared by: ${proj.designer}</div>`:""}</div></div>
<div style="margin-bottom:20px"><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">${(quote.rooms||[]).filter(r=>r.locType).length} Rooms · ${locs.length} Location Types</div><div>${locTags}</div></div>
<div style="margin-bottom:24px"><div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:10px">Design Stage Breakdown</div>
<div class="card"><table><thead><tr style="background:#f8f7f5"><th style="padding:10px 16px;font-size:12px;font-weight:700;color:#4a4a4a;text-align:left;border-bottom:1px solid #d0cfc9">Stage / Deliverables & Description</th><th style="padding:10px;font-size:12px;font-weight:700;color:#4a4a4a;text-align:center;border-bottom:1px solid #d0cfc9">Hours</th><th style="padding:10px;font-size:12px;font-weight:700;color:#4a4a4a;text-align:center;border-bottom:1px solid #d0cfc9">Rate/hr</th><th style="padding:10px 16px;font-size:12px;font-weight:700;color:#4a4a4a;text-align:right;border-bottom:1px solid #d0cfc9">Stage Fee</th></tr></thead>
<tbody>${stageRows}${s4Row}${totalsRow}</tbody></table></div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">${feeSummaryHTML}</div>
<div class="card" style="padding:18px"><div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:10px">Terms & Conditions</div>
<div style="font-size:12px;color:#4a4a4a;line-height:1.8"><div>1. This quotation is valid for 30 days from the date of issue.</div><div>2. All fees are quoted in Nigerian Naira (NGN). VAT at 7.5% applies to all design fees.</div><div>3. Design work commences upon receipt of 50% advance payment and execution of the CED Africa Design Services Agreement.</div><div>4. Any scope change after Stage 1 sign-off requires a formal Variation Order.</div><div>5. CED Africa AV Design Studio retains IP ownership of all documents until final payment.</div></div>
<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e4e0"><div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:8px">Standard Exclusions</div><div style="font-size:12px;color:#4a4a4a;line-height:1.8">${excl}</div></div>
<div style="margin-top:16px;padding-top:14px;border-top:1px solid #e5e4e0;display:grid;grid-template-columns:1fr 1fr;gap:24px">
  <div><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Payment Information</div><div style="font-size:12px;color:#4a4a4a;line-height:1.8"><strong>USD:</strong> Custom Electronics Distribution · Standard Chartered Bank · A/C: 0005866571<br><strong>NGN:</strong> Custom Electronics Distribution · Access Bank · A/C: 0073984770</div></div>
  <div><div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Authorised Signature</div><div style="border-bottom:1px solid #1a1a1a;height:40px;margin-bottom:4px"></div><div style="font-size:11px;color:#888">CED Africa · AV Consulting Design Studio</div></div></div>
</div>
<div style="margin-top:24px;text-align:center;font-size:11px;color:#aaa">CED Africa — Customer Electronics Distribution Limited · 17 Adeyemo Alakija St, Victoria Island, Lagos · 0808 666 2168</div>
</div></body></html>`
}

// ── Main App ───────────────────────────────────────────────
// ── Client Portal ─────────────────────────────────────────────────
// Rendered when URL hash = #portal/{clientToken} — no login required
function ClientPortal({token}) {
  const [quote, setQuote] = useState(null)
  const [settings, setSettings] = useState(null)
  const [calc, setCalc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [signName, setSignName] = useState("")
  const [declined, setDeclined] = useState(false)
  const [declineNote, setDeclineNote] = useState("")
  const [done, setDone] = useState(null) // "accepted" | "declined"
  const [currency, setCurrency] = useState("NGN")

  useEffect(()=>{
    const load = async () => {
      const quotes = await store.getQuotes()
      const s = await store.getSettings()
      const q = quotes.find(q=>q.clientToken===token)
      if (q) {
        const c = calcQuote(q.rooms||[], q.mapOv||{}, q.cfg||{}, {...s, rate:q.rateOverride||s.rate||80000})
        setQuote(q); setSettings(s); setCalc(c)
        if (q.status==="accepted"||q.status==="declined") setDone(q.status)
      }
      setLoading(false)
    }
    load()
  },[token])

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg2}}>
      <div style={{textAlign:"center"}}>
        <div style={{background:AMBER,color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:4,letterSpacing:".07em",marginBottom:10,display:"inline-block"}}>CED AFRICA</div>
        <div style={{fontSize:14,color:C.text3}}>Loading your quotation...</div>
      </div>
    </div>
  )

  if (!quote) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg2,padding:20}}>
      <Card style={{padding:32,maxWidth:420,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>🔗</div>
        <div style={{fontSize:16,fontWeight:600,color:C.text,marginBottom:6}}>Quotation not found</div>
        <div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>This link may be invalid or the quotation may have been withdrawn. Please contact CED Africa directly.</div>
        <div style={{marginTop:16,fontSize:12,color:C.text3}}>📞 0808 666 2168 · cedafrica.com</div>
      </Card>
    </div>
  )

  const proj = quote.proj||{}
  const usdRate = settings.usdRate||1600
  const fmt = n => currency==="USD" ? "$"+Math.round(n/usdRate).toLocaleString("en-US") : "₦"+Math.round(n).toLocaleString("en-NG")

  const handleAccept = async () => {
    if (!signName.trim()) return
    const now = Date.now()
    const quotes = await store.getQuotes()
    const updated = {
      ...quote, status:"accepted",
      clientSignedBy:signName, clientSignedAt:now, clientResponseAt:now,
      history:[...(quote.history||[]),{timestamp:now,action:"accepted",by:"client",byName:signName,notes:"Client accepted via portal"}]
    }
    await store.saveQuotes(quotes.map(q=>q.id===quote.id?updated:q))
    setDone("accepted")
  }

  const handleDecline = async () => {
    const now = Date.now()
    const quotes = await store.getQuotes()
    const updated = {
      ...quote, status:"declined",
      clientResponseAt:now,
      history:[...(quote.history||[]),{timestamp:now,action:"declined",by:"client",byName:"Client",notes:declineNote||"Client declined via portal"}]
    }
    await store.saveQuotes(quotes.map(q=>q.id===quote.id?updated:q))
    setDone("declined")
  }

  if (done==="accepted") return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0fdf4",padding:20}}>
      <Card style={{padding:40,maxWidth:480,textAlign:"center",border:`2px solid ${C.green}`}}>
        <div style={{fontSize:48,marginBottom:12}}>✅</div>
        <div style={{fontSize:20,fontWeight:700,color:C.green,marginBottom:6}}>Quotation Accepted</div>
        <div style={{fontSize:14,color:C.text,marginBottom:4}}>{proj.name||"Your project"}</div>
        <div style={{fontSize:13,color:C.text2,lineHeight:1.6,marginBottom:16}}>
          Thank you, <strong>{quote.clientSignedBy}</strong>. Your acceptance has been recorded on {dateStr(quote.clientSignedAt)}. CED Africa will be in touch shortly to commence the design engagement.
        </div>
        <div style={{fontSize:12,color:C.text3}}>Ref: {quote.ref} · CED Africa AV Design Studio</div>
        <div style={{marginTop:12,fontSize:12,color:C.text3}}>📞 0808 666 2168 · 17 Adeyemo Alakija St, Victoria Island, Lagos</div>
      </Card>
    </div>
  )

  if (done==="declined") return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg2,padding:20}}>
      <Card style={{padding:40,maxWidth:480,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>👋</div>
        <div style={{fontSize:18,fontWeight:600,color:C.text,marginBottom:6}}>Response Recorded</div>
        <div style={{fontSize:13,color:C.text2,lineHeight:1.6,marginBottom:16}}>
          Thank you for your response. If you have questions or would like to discuss the quotation, please contact us directly.
        </div>
        <div style={{fontSize:12,color:C.text3}}>📞 0808 666 2168 · cedafrica.com</div>
      </Card>
    </div>
  )

  return (
    <div style={{minHeight:"100vh",background:C.bg2}}>
      {/* Portal header */}
      <div style={{background:C.bg,borderBottom:`1px solid ${C.border}`,padding:"12px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:AMBER,color:"#fff",fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:4,letterSpacing:".07em"}}>CED AFRICA</div>
          <span style={{fontSize:13,color:C.text2}}>AV Design Services Quotation</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",borderRadius:7,overflow:"hidden",border:`1px solid ${C.border}`}}>
            {["NGN","USD"].map(c=>(
              <button key={c} onClick={()=>setCurrency(c)} style={{padding:"5px 12px",border:"none",fontSize:12,fontWeight:600,cursor:"pointer",background:currency===c?AMBER:"transparent",color:currency===c?"#fff":C.text2}}>{c==="NGN"?"₦ NGN":"$ USD"}</button>
            ))}
          </div>
          <button onClick={()=>window.print()} style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${C.border}`,background:C.bg,fontSize:12,cursor:"pointer",color:C.text2}}>🖨 Print / PDF</button>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"28px 20px"}} className="print-area">
        {/* Quote header */}
        <div style={{background:C.bg,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 24px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,paddingBottom:16,borderBottom:`1px solid ${C.border2}`}}>
            <div>
              <div style={{fontSize:11,color:AMBER,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>CED Africa — AV Consulting Design Services</div>
              <div style={{fontSize:18,fontWeight:700,color:C.text}}>Design Services Quotation</div>
              <div style={{fontSize:13,color:C.text2,marginTop:3}}>Residential Home Technology System</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:22,fontWeight:700,color:C.text}}>QUOTATION</div>
              <div style={{fontSize:12,color:C.text3,marginTop:3}}>{quote.ref}</div>
              <div style={{fontSize:12,color:C.text3}}>{proj.date}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
            <div>
              <SectionTitle>Prepared For</SectionTitle>
              <div style={{fontSize:15,fontWeight:600,color:C.text}}>{proj.client||"—"}</div>
              {proj.address&&<div style={{fontSize:12,color:C.text2,marginTop:2}}>{proj.address}</div>}
              {proj.ownerEmail&&<div style={{fontSize:12,color:C.text2,marginTop:2}}>{proj.ownerEmail}</div>}
            </div>
            <div>
              <SectionTitle>Project</SectionTitle>
              <div style={{fontSize:15,fontWeight:600,color:C.text}}>{proj.name||"—"}</div>
              {proj.designer&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>Designed by: {proj.designer}</div>}
            </div>
            <div>
              <SectionTitle>Quotation Status</SectionTitle>
              <Badge status={quote.status}/>
              {quote.clientSignedBy&&<div style={{fontSize:11,color:C.green,marginTop:4}}>Accepted by {quote.clientSignedBy}</div>}
            </div>
          </div>
        </div>

        {/* Fee summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
          {[["Design Fee (excl. VAT)",fmt(calc.subtotal)],["VAT 7.5%",fmt(calc.vatAmt)],["Grand Total",fmt(calc.grand)]].map(([l,v],i)=>(
            <Card key={l}><div style={{padding:16,textAlign:"center"}}>
              <div style={{fontSize:i===2?22:18,fontWeight:700,color:i===2?AMBER:C.text}}>{v}</div>
              <div style={{fontSize:12,color:C.text3,marginTop:3}}>{l}</div>
            </div></Card>
          ))}
        </div>

        {/* Stage breakdown */}
        <SectionTitle>Design Stage Breakdown & Deliverables</SectionTitle>
        <Card style={{marginBottom:20}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:C.bg2}}>
                {["Stage / Deliverables & Description","Hours","Rate/hr","Stage Fee"].map((h,i)=>(
                  <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:600,color:C.text3,textAlign:i===0?"left":i===3?"right":"center",borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calc.stageList.map(st=>(
                <tr key={st.id} style={{borderTop:`1px solid ${C.border2}`}}>
                  <td style={{padding:"13px 14px",verticalAlign:"top"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:st.color,flexShrink:0,marginTop:3}}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>Stage {st.num} — {st.name}</div>
                        <div style={{fontSize:11,color:C.text3,marginBottom:7}}>{st.sub}</div>
                        {(PLAIN[st.id]||[]).map((d,i)=>(
                          <div key={i} style={{marginBottom:6}}>
                            <div style={{fontSize:12,fontWeight:500,color:C.text}}>• {d.title}</div>
                            <div style={{fontSize:11,color:C.text2,lineHeight:1.5,marginLeft:10,marginTop:1}}>{d.plain}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"13px 10px",textAlign:"center",fontSize:13,fontWeight:600,color:C.text,verticalAlign:"top"}}>{hrs(st.hours)}</td>
                  <td style={{padding:"13px 10px",textAlign:"center",fontSize:12,color:C.text2,verticalAlign:"top"}}>{fmt(st.hours>0?calc.RATE:0).replace(/[₦$]\d.*/,"")}{currency==="NGN"?"₦":"$"}{currency==="NGN"?Math.round(calc.RATE).toLocaleString("en-NG"):Math.round(calc.RATE/usdRate).toLocaleString("en-US")}/hr</td>
                  <td style={{padding:"13px 14px",textAlign:"right",fontSize:13,fontWeight:600,color:C.text,verticalAlign:"top"}}>{fmt(st.fee)}</td>
                </tr>
              ))}
              {quote.cfg?.s4Included&&(
                <tr style={{borderTop:`1px solid ${C.border2}`,background:`${AMBER}06`}}>
                  <td style={{padding:"13px 14px",verticalAlign:"top"}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:5}}>
                      Stage 04 — Project Delivery Governance
                      <span style={{marginLeft:8,fontSize:11,padding:"2px 7px",borderRadius:4,background:`${AMBER}20`,color:AMBER}}>RETAINER</span>
                    </div>
                    {PLAIN_S4.map((d,i)=>(
                      <div key={i} style={{marginBottom:6}}>
                        <div style={{fontSize:12,fontWeight:500,color:C.text}}>• {d.title}</div>
                        <div style={{fontSize:11,color:C.text2,lineHeight:1.5,marginLeft:10,marginTop:1}}>{d.plain}</div>
                      </div>
                    ))}
                  </td>
                  <td style={{padding:"13px 10px",textAlign:"center",fontSize:12,color:C.text2,verticalAlign:"top"}}>{quote.cfg.s4Months} months</td>
                  <td style={{padding:"13px 10px",textAlign:"center",fontSize:12,color:C.text2,verticalAlign:"top"}}>{fmt(calc.s4Monthly)}/mo</td>
                  <td style={{padding:"13px 14px",textAlign:"right",fontSize:13,fontWeight:600,color:AMBER,verticalAlign:"top"}}>{fmt(calc.s4Total)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Fee summary + payment */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          <Card><div style={{padding:16}}>
            <SectionTitle>Fee Summary</SectionTitle>
            {[["Design Fee (excl. VAT)",fmt(calc.subtotal),false],
              ...(quote.cfg?.discount>0?[["Discount ("+quote.cfg.discount+"%)", "– "+fmt(calc.discAmt),false],["After Discount",fmt(calc.afterDisc),false]]:[]),
              ["VAT (7.5%)",fmt(calc.vatAmt),false],
              ["Grand Total",fmt(calc.grand),true],
              ...(quote.cfg?.s4Included?[["Stage 4 Retainer (est. "+quote.cfg.s4Months+" months)",fmt(calc.s4Total)+" *",false]]:[])
            ].map(([l,v,bold])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:bold?`1px solid ${C.border}`:"none",marginTop:bold?5:0}}>
                <span style={{fontSize:13,color:C.text2}}>{l}</span>
                <span style={{fontSize:bold?16:13,fontWeight:bold?700:500,color:bold?AMBER:C.text}}>{v}</span>
              </div>
            ))}
            {quote.cfg?.s4Included&&<div style={{fontSize:11,color:C.text3,marginTop:6}}>* Stage 4 prepaid monthly from execution kick-off.</div>}
              {quote.cfg?.s4Included&&session.role==="lead"&&(
                <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border2}`}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:6}}>🧾 Generate Monthly Retainer Invoice</div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:12,color:C.text2}}>Month:</span>
                    <select id="s4InvMonth" defaultValue="1" style={{...inp({padding:"5px 8px",fontSize:12}),width:68}}>
                      {Array.from({length:quote.cfg?.s4Months||12},(_,i)=>(
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                    <Btn small onClick={()=>{
                      const mn=parseInt(document.getElementById("s4InvMonth")?.value||1)
                      const html=buildRetainerInvoice(quote,calc,settings,mn)
                      const rc=(quote.ref||"CED").replace(/\//g,"-")
                      const blob=new Blob([html],{type:"text/html;charset=utf-8"})
                      const url=URL.createObjectURL(blob)
                      const a=document.createElement("a")
                      a.href=url;a.download=`${rc}_S4_Invoice_Month${String(mn).padStart(2,"0")}.html`
                      document.body.appendChild(a);a.click()
                      document.body.removeChild(a);URL.revokeObjectURL(url)
                    }}>Download Invoice</Btn>
                  </div>
                </div>
              )}
          </div></Card>
          <Card><div style={{padding:16}}>
            <SectionTitle>Payment Schedule</SectionTitle>
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.text2}}>50% Advance Payment</span><span style={{fontSize:14,fontWeight:600,color:C.text}}>{fmt(calc.grand*0.5)}</span></div>
              <div style={{fontSize:11,color:C.text3,marginTop:2}}>Due to commence design work</div>
            </div>
            <div style={{marginBottom:quote.cfg?.s4Included?10:0}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.text2}}>50% Balance Payment</span><span style={{fontSize:14,fontWeight:600,color:C.text}}>{fmt(calc.grand*0.5)}</span></div>
              <div style={{fontSize:11,color:C.text3,marginTop:2}}>Due on delivery of documentation</div>
            </div>
            {quote.cfg?.s4Included&&(
              <div style={{paddingTop:10,borderTop:`1px solid ${C.border2}`}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.text2}}>Stage 4 Monthly Retainer</span><span style={{fontSize:14,fontWeight:600,color:AMBER}}>{fmt(calc.s4Monthly)}/mo</span></div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>Prepaid monthly from execution kick-off</div>
              </div>
            )}
          </div></Card>
        </div>

        {/* T&C */}
        <Card style={{marginBottom:24}}><div style={{padding:16}}>
          <SectionTitle>Terms & Conditions</SectionTitle>
          <div style={{fontSize:12,color:C.text2,lineHeight:1.8,marginBottom:10}}>
            <div>1. This quotation is valid for 30 days from the date of issue.</div>
            <div>2. All fees are quoted in Nigerian Naira (NGN). VAT at 7.5% applies to all design fees.</div>
            <div>3. Design work commences upon receipt of 50% advance payment and execution of the CED Africa Design Services Agreement.</div>
            <div>4. Any scope changes after Stage 1 sign-off require a formal Variation Order.</div>
            <div>5. CED Africa AV Design Studio retains intellectual ownership of all documents until final payment is received.</div>
          </div>
          {settings.exclusions&&settings.exclusions.length>0&&(
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:6}}>Standard Exclusions</div>
              <div style={{fontSize:12,color:C.text2,lineHeight:1.8}}>
                {settings.exclusions.map((ex,i)=><div key={i}>{i+1}. {ex}</div>)}
              </div>
            </div>
          )}
        </div></Card>

        {/* Accept / Decline panel */}
        {(quote.status==="sent")&&(
          <Card style={{padding:24,border:`2px solid ${signing||declined?AMBER:C.border}`,marginBottom:24}}>
            <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:4}}>Your Response</div>
            <div style={{fontSize:13,color:C.text2,marginBottom:18,lineHeight:1.6}}>
              Please review the quotation above carefully. By clicking "Accept Quotation" below, you confirm that you have read, understood, and agree to the terms, scope, and fees set out above.
            </div>

            {!declined&&(
              <div style={{marginBottom:16}}>
                {!signing?(
                  <Btn onClick={()=>setSigning(true)} variant="success" style={{marginRight:10}}>✓ Accept Quotation</Btn>
                ):(
                  <div>
                    <div style={{fontSize:13,fontWeight:500,color:C.text,marginBottom:8}}>Enter your full name to sign and accept this quotation:</div>
                    <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
                      <div style={{flex:1}}>
                        <input value={signName} onChange={e=>setSignName(e.target.value)}
                          placeholder="Your full legal name (e.g. Emeka Okafor)"
                          style={{...inp({fontSize:15,borderColor:signName?C.green:C.border})}}
                          autoFocus/>
                      </div>
                      <Btn onClick={handleAccept} disabled={!signName.trim()} variant="success">Confirm Acceptance</Btn>
                      <Btn onClick={()=>{setSigning(false);setSignName("")}} variant="ghost">Cancel</Btn>
                    </div>
                    <div style={{fontSize:11,color:C.text3,marginTop:6}}>By confirming, you are digitally signing this quotation on behalf of the project owner.</div>
                  </div>
                )}
              </div>
            )}

            <div style={{borderTop:`1px solid ${C.border2}`,paddingTop:14}}>
              {!declined?(
                <div>
                  <button onClick={()=>setDeclined(true)} style={{background:"transparent",border:"none",fontSize:13,color:C.text3,cursor:"pointer",textDecoration:"underline"}}>
                    Decline this quotation
                  </button>
                </div>
              ):(
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:C.text,marginBottom:8}}>Are you sure you want to decline? You may optionally leave a note:</div>
                  <textarea value={declineNote} onChange={e=>setDeclineNote(e.target.value)} rows={2}
                    placeholder="Optional: reason for declining (seen by CED Africa only)"
                    style={{...inp(),resize:"vertical",marginBottom:10}}/>
                  <div style={{display:"flex",gap:8}}>
                    <Btn onClick={handleDecline} variant="ghost" style={{borderColor:C.red,color:C.red}}>Confirm Decline</Btn>
                    <Btn onClick={()=>setDeclined(false)} variant="ghost">Go Back</Btn>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Already responded */}
        {quote.status==="accepted"&&(
          <Card style={{padding:16,border:`2px solid ${C.green}`,marginBottom:24,background:"#f0fdf4"}}>
            <div style={{fontSize:14,fontWeight:600,color:C.green}}>✅ This quotation was accepted by {quote.clientSignedBy} on {dateStr(quote.clientSignedAt)}</div>
          </Card>
        )}

        {/* Footer */}
        <div style={{textAlign:"center",fontSize:11,color:C.text3,paddingBottom:20}}>
          <div>CED Africa — Customer Electronics Distribution Limited</div>
          <div>17 Adeyemo Alakija St, Victoria Island, Lagos · 0808 666 2168</div>
          <div style={{marginTop:4}}>Ref: {quote.ref}</div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 20px 32px; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  )
}


function CEDStudio() {
  const [loaded,setLoaded]=useState(false)
  const [session,setSession]=useState(null)
  const [page,setPage]=useState("quotes")
  const [settings,setSettings]=useState(null)
  const [quotes,setQuotes]=useState([])
  const [view,setView]=useState("list") // list | builder | detail | templates
  const [activeQuote,setActiveQuote]=useState(null)
  const [templateRooms,setTemplateRooms]=useState(null) // pre-filled rooms from template
  const [customTemplates,setCustomTemplates]=useState([])
  const [discoveries,setDiscoveries]=useState([])
  const [convertFromQuote,setConvertFromQuote]=useState(null)
  const [discoverySeed,setDiscoverySeed]=useState(null)

  useEffect(()=>{
    const init = async () => {
      // Seed default admin if no users exist
      let users = await store.getUsers()
      if (users.length===0) {
        const admin = {id:"admin-1",name:"Studio Lead",email:"lead@cedafrica.com",role:"lead",password:hp("CED@2025"),active:true,createdAt:Date.now()}
        await store.saveUsers([admin])
      }
      const sess = await store.get("ced_session")
      if (sess) {
        const currentUsers = await store.getUsers()
        const user = currentUsers.find(u=>u.id===sess.userId&&u.active)
        if (user) setSession({...sess,...user})
      }
      const s = await store.getSettings()
      setSettings(s)
      const q = await store.getQuotes()
      setQuotes(q)
      const d = await store.getDiscoveries()
      setDiscoveries(d)
      setLoaded(true)
    }
    init()
  },[])

  const logout = async () => {
    await store.set("ced_session",null)
    setSession(null)
    setPage("quotes")
    setView("list")
    setActiveQuote(null)
  }

  const handleLogin = async (user) => {
    setSession({userId:user.id,role:user.role,name:user.name,email:user.email})
    const s = await store.getSettings()
    const q = await store.getQuotes()
    const tpls = await store.get("ced_templates") || []
    setSettings(s)
    setQuotes(q)
    setCustomTemplates(tpls)
  }

  const refreshQuotes = async () => {
    const q = await store.getQuotes()
    setQuotes(q)
  }
  const refreshDiscoveries = async () => {
    const d = await store.getDiscoveries()
    setDiscoveries(d)
  }

  // Hash routing for client portal — no auth required
  const hash = typeof window!=="undefined" ? window.location.hash : ""
  const portalMatch = hash.match(/^#portal\/(.+)$/)
  if (portalMatch) return <ClientPortal token={portalMatch[1]}/>

  if (!loaded) return <div style={{minHeight:"100vh",background:C.bg2,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{background:AMBER,color:"#fff",fontSize:13,fontWeight:700,padding:"4px 14px",borderRadius:6,letterSpacing:".07em",marginBottom:12,display:"inline-block"}}>CED AFRICA</div><div style={{fontSize:14,color:C.text3}}>Loading Design Studio...</div></div></div>

  if (!session) return <LoginScreen onLogin={handleLogin}/>

  return (
    <AppShell session={session} onLogout={logout} page={page} setPage={p=>{setPage(p);setView("list");setActiveQuote(null)}}>
      {page==="quotes"&&(
        <>
          {view==="list"&&(
            <QuotesList
              session={session} settings={settings||{}}
              onNew={()=>{ setActiveQuote(null); setTemplateRooms(null); setView("templates") }}
              onExport={()=>exportQuotesCSV(quotes)}
              onOpen={q=>{ setActiveQuote(q); setView("detail") }}
            />
          )}
          {view==="templates"&&(
            <TemplatePicker
              allTemplates={[...DEF_TEMPLATES,...customTemplates]}
              onSelect={tpl=>{ setTemplateRooms(tpl.rooms.map(r=>({...r,id:uid()}))); setActiveQuote(null); setView("builder") }}
              onScratch={()=>{ setTemplateRooms(null); setActiveQuote(null); setView("builder") }}
              onClose={()=>setView("list")}
            />
          )}
          {view==="builder"&&(
            <QuoteBuilder
              session={session} settings={settings||{}} editQuote={activeQuote}
              convertFromQuote={convertFromQuote}
              discoverySeed={discoverySeed}
              templateRooms={templateRooms}
              customTemplates={customTemplates}
              onSaveTemplate={async(tpl)=>{
                const updated=[...customTemplates,{...tpl,id:uid(),isBuiltIn:false,createdBy:session.userId,createdByName:session.name,createdAt:Date.now()}]
                await store.set("ced_templates",updated)
                setCustomTemplates(updated)
              }}
              onSave={async(q)=>{ await refreshQuotes(); setActiveQuote(q); setView("detail") }}
              onCancel={()=>{ setConvertFromQuote(null); setDiscoverySeed(null); setView("list") }}
            />
          )}
          {view==="detail"&&activeQuote&&(
            <QuoteDetail
              quote={activeQuote} session={session} settings={settings||{}}
              onBack={()=>setView("list")}
              onEdit={()=>setView("builder")}
              onUpdate={async(q)=>{ await refreshQuotes(); setActiveQuote(q) }}
              onConvert={(specQ)=>{
                setConvertFromQuote(specQ)
                setActiveQuote(null)
                setTemplateRooms(null)
                setView("builder")
              }}
            />
          )}
        </>
      )}
      {page==="dashboard"&&<Dashboard session={session} quotes={quotes}
          onOpenQuote={q=>{ setActiveQuote(q); setPage("quotes"); setView("detail") }}/>}
      {page==="discovery"&&(
        <DiscoveryModule
          session={session} settings={settings||{}}
          discoveries={discoveries}
          onRefresh={refreshDiscoveries}
          onSeedQuote={(rooms, projSeed)=>{
            setTemplateRooms(rooms)
            setActiveQuote(null)
            setConvertFromQuote(null)
            setDiscoverySeed(projSeed)
            setPage("quotes")
            setView("builder")
          }}
        />
      )}
      {page==="admin"&&session.role==="lead"&&(
        <AdminPanel session={session} onSettingsChange={async(s)=>{setSettings(s);await store.saveSettings(s)}}/>
      )}
    </AppShell>
  )
}
