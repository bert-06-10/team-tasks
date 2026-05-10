export const initProgramTasks = [
  {id:1,title:"Design onboarding flow",assignee:"Alex Chen",assist:"Riley Kim",due:"2026-04-01",status:"In Progress",notes:"Focus on mobile-first",deps:[],collateralDeps:[],attachedDocs:[],tags:["design"],offset:10,department:"Design",type:"program"},
  {id:2,title:"Write API documentation",assignee:"Jordan Lee",assist:"",due:"2026-04-05",status:"To Do",notes:"Cover all v2 endpoints",deps:[1],collateralDeps:[],attachedDocs:[],tags:["docs"],offset:20,department:"Engineering",type:"program"},
  {id:3,title:"Set up CI/CD pipeline",assignee:"Sam Patel",assist:"",due:"2026-03-25",status:"Done",notes:"Use GitHub Actions",deps:[],collateralDeps:[],attachedDocs:[],tags:["engineering"],offset:5,department:"Engineering",type:"program"},
  {id:4,title:"User testing sessions",assignee:"Riley Kim",assist:"Alex Chen",due:"2026-04-10",status:"To Do",notes:"Recruit 5 participants",deps:[1],collateralDeps:[],attachedDocs:[],tags:["research"],offset:30,department:"Research",type:"program"},
  {id:5,title:"Performance audit",assignee:"Morgan Davis",assist:"",due:"2026-03-30",status:"In Progress",notes:"Target <2s load time",deps:[3],collateralDeps:[],attachedDocs:[],tags:["engineering"],offset:15,department:"Engineering",type:"program"},
];

export const initSessions = [
  {id:"s1",name:"Session 1",date:"2026-03-25",number:1},
  {id:"s2",name:"Session 2",date:"2026-04-08",number:2},
  {id:"s3",name:"Session 3",date:"2026-04-22",number:3},
];

export const initDocs = [
  {id:1,title:"Product Roadmap Q2",type:"Google Drive",audience:"All Team",description:"High-level roadmap for Q2 2026.",updated:"2026-03-10",owner:"Alex Chen",url:"#",tags:["roadmap"]},
  {id:2,title:"API Reference v2",type:"PDF",audience:"Engineering",description:"Complete v2 API reference.",updated:"2026-03-01",owner:"Jordan Lee",url:"#",tags:["docs"]},
  {id:3,title:"Brand Guidelines",type:"Web Link",audience:"Design, Marketing",description:"Logo, colors, and typography.",updated:"2026-02-15",owner:"Riley Kim",url:"#",tags:["brand"]},
];

export const initMilestones = [
  {id:"m1",title:"Kickoff",date:"2026-03-18"},
  {id:"m2",title:"Mid-cycle review",date:"2026-04-15"},
  {id:"m3",title:"Final delivery",date:"2026-06-18"},
];

export const initCycle = {name:"Spring 2026",start:"2026-03-18",end:"2026-06-18",holidays:[]};

export const initRunOfShow = {
  s1: [
    {id:"r1",cohort:"Cohort A",time:"9:00 AM",event:"Welcome & introductions",owner:"Alex Chen",assist:"Riley Kim",notes:"Use slide deck v3"},
    {id:"r2",cohort:"All",time:"9:30 AM",event:"Keynote presentation",owner:"Jordan Lee",assist:"",notes:""},
    {id:"r3",cohort:"Cohort B",time:"10:30 AM",event:"Breakout session",owner:"Sam Patel",assist:"Morgan Davis",notes:"Room 2B"},
  ],
  s2: [],
  s3: [],
};
