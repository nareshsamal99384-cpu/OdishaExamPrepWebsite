export interface AchieverStory {
  name: string;
  rank: string;
  examCategory: 'opsc' | 'ossc' | 'osssc';
  story: string;
  avatar: string;
  stats: {
    score: string;
    accuracy: string;
    time: string;
  };
  district: string;
  date?: string;
}

export const DEFAULT_ACHIEVERS_JOURNAL: AchieverStory[] = [
  {
    name: "Satyajit Behera",
    rank: "OPSC OAS Rank 42",
    examCategory: "opsc",
    story: "Daily practice kariba pare weak topics clear bujhi paruchi. The syllabus timeline mappings kept my prep highly structured without any guide books.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Satyajit",
    stats: { score: "128.5 / 200", accuracy: "94% Accuracy", time: "8 Months Prep" },
    district: "Cuttack"
  },
  {
    name: "Priyanka Nayak",
    rank: "OSSC CGL Selected (Inspector)",
    examCategory: "ossc",
    story: "The CBT mock test system interface mimics the real OSSC exam hall environment 100%. Practicing under pressure improved my timing dramatically.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Priyanka",
    stats: { score: "142 / 150", accuracy: "91% Accuracy", time: "6 Months Prep" },
    district: "Bhubaneswar"
  },
  {
    name: "Subhasmita Mohapatra",
    rank: "OPSC OAS Candidate",
    examCategory: "opsc",
    story: "General Studies mock test re Odisha history questions level bahut high thila. Direct questions exam paper clear karibare help kala.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Subhasmita",
    stats: { score: "132 / 200", accuracy: "89% Accuracy", time: "1 Year Prep" },
    district: "Bhubaneswar"
  },
  {
    name: "Alok Ranjan Jena",
    rank: "OSSC CGL Selected (Auditor)",
    examCategory: "ossc",
    story: "Arithmetic & Reasoning solution options detail re explain karanti. Shortcut tricks upjogee hela exam re.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Alok",
    stats: { score: "138 / 150", accuracy: "93% Accuracy", time: "5 Months Prep" },
    district: "Bhadrak"
  },
  {
    name: "Deepak Kumar Sahoo",
    rank: "OSSSC RI Selected (Cuttack)",
    examCategory: "osssc",
    story: "Odia grammar questions sets and computer awareness mock tests RI exam pattern pain full exact thila. Special thanks for negative markings calculation practice.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Deepak",
    stats: { score: "148.5 / 200", accuracy: "95% Accuracy", time: "7 Months Prep" },
    district: "Jajpur"
  },
  {
    name: "Swagatika Priyadarshini",
    rank: "OSSSC Amin Selected",
    examCategory: "osssc",
    story: "Varying difficulty levels in test series are amazing. Starting from beginner, it slowly builds speed for OSSSC Amin CBT.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Swagatika",
    stats: { score: "78.5 / 100", accuracy: "92% Accuracy", time: "4 Months Prep" },
    district: "Balasore"
  },
  {
    name: "Debashis Pradhan",
    rank: "OPSC OAS Candidate",
    examCategory: "opsc",
    story: "Daily current affairs tests and GS sectional mocks saved my time. UTKAL geography questions collection is excellent.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Debashis",
    stats: { score: "120 / 200", accuracy: "88% Accuracy", time: "9 Months Prep" },
    district: "Sambalpur"
  },
  {
    name: "Manaswini Tripathy",
    rank: "OSSC CGL Candidate",
    examCategory: "ossc",
    story: "Language paper test series re translation options and sandhi/samasa rules Odisha board standards ku match karuchi.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Manaswini",
    stats: { score: "89 / 100", accuracy: "94% Accuracy", time: "6 Months Prep" },
    district: "Puri"
  },
  {
    name: "Rajesh Kumar Barik",
    rank: "Police SI Selected",
    examCategory: "ossc",
    story: "Sub-Inspector physical preparation saha daily mock test practice karutheli. Police SI mock test sets set standard thila.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Rajesh",
    stats: { score: "245 / 300", accuracy: "90% Accuracy", time: "8 Months Prep" },
    district: "Ganjam"
  },
  {
    name: "Chinmayee Mishra",
    rank: "OSSSC ARI Aspirant",
    examCategory: "osssc",
    story: "Computer section mock test re direct shortcuts ask karithile. Practical shortcuts exam re speed up kale.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Chinmayee",
    stats: { score: "136.5 / 200", accuracy: "91% Accuracy", time: "5 Months Prep" },
    district: "Angul"
  },
  {
    name: "Prabhat Chandra Senapati",
    rank: "OSSSC RI Selected",
    examCategory: "osssc",
    story: "Baripada re self study karutheli. OdishaExamPrep platform bina coaching re help kala mock practice pain.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Prabhat",
    stats: { score: "154 / 200", accuracy: "92% Accuracy", time: "10 Months Prep" },
    district: "Mayurbhanj"
  },
  {
    name: "Sonali Priyadarshini",
    rank: "OSSC ATO Selected",
    examCategory: "ossc",
    story: "Highly recommended for OSSC aspirants. Sectional tests solved my maths phobia.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Sonali",
    stats: { score: "112 / 150", accuracy: "87% Accuracy", time: "6 Months Prep" },
    district: "Rourkela"
  },
  {
    name: "Ashish Kumar Panda",
    rank: "OPSC OAS Candidate",
    examCategory: "opsc",
    story: "The essay topics guidance and GS Answer writing sections gave me the structure I needed for OAS Mains.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Ashish",
    stats: { score: "310 / 600", accuracy: "85% Accuracy", time: "1.5 Years Prep" },
    district: "Berhampur"
  },
  {
    name: "Bikram Keshari Rout",
    rank: "OSSSC Amin Aspirant",
    examCategory: "osssc",
    story: "Arithmetic calculation tricks are best. Mock questions exact board level pattern re achi.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Bikram",
    stats: { score: "68 / 100", accuracy: "90% Accuracy", time: "3 Months Prep" },
    district: "Kendrapara"
  },
  {
    name: "Jyotirmayee Das",
    rank: "OSSC Junior Clerk Selected",
    examCategory: "ossc",
    story: "Typing test tips are very helpful. Typing mock test page re dynamic timer layout thila exact official clerk speed check thila.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Jyotirmayee",
    stats: { score: "128 / 150", accuracy: "93% Accuracy", time: "4 Months Prep" },
    district: "Jagatsinghpur"
  },
  {
    name: "Soumya Ranjan Patnaik",
    rank: "OPSC OAS Rank 18",
    examCategory: "opsc",
    story: "The test series is very close to real OAS Prelims pattern. The analytics view showed my section-wise ranking which helped me compete with other top candidates.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Soumya",
    stats: { score: "141.2 / 200", accuracy: "96% Accuracy", time: "1 Year Prep" },
    district: "Bhubaneswar"
  },
  {
    name: "Sujata Senapati",
    rank: "OSSSC RI Aspirant",
    examCategory: "osssc",
    story: "Odisha GK section in RI exam test series is very descriptive. Each question has detailed explanation options with related points.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Sujata",
    stats: { score: "131 / 200", accuracy: "89% Accuracy", time: "6 Months Prep" },
    district: "Balasore"
  },
  {
    name: "Niranjan Khuntia",
    rank: "OSSC CGL Selected",
    examCategory: "ossc",
    story: "Ravenshaw library re baseline mock test daily deba morning re. Accuracy improved from 72% to 93% in 3 months.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Niranjan",
    stats: { score: "139 / 150", accuracy: "93% Accuracy", time: "5 Months Prep" },
    district: "Cuttack"
  },
  {
    name: "Rashmirekha Baral",
    rank: "OSSSC Amin Selected",
    examCategory: "osssc",
    story: "Amin paper calculation parts re exact number properties thila. Computer questions sets are comprehensive.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Rashmirekha",
    stats: { score: "76 / 100", accuracy: "91% Accuracy", time: "4 Months Prep" },
    district: "Khordha"
  },
  {
    name: "Kamal Lochan Mohanty",
    rank: "OPSC OAS Aspirant",
    examCategory: "opsc",
    story: "Mains preparation pain geography optional mocks were very structured. Thanks to OdishaExamPrep creators.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Kamal",
    stats: { score: "345 / 600", accuracy: "87% Accuracy", time: "1.2 Years Prep" },
    district: "Puri"
  },
  {
    name: "Swadhin Chandra Behera",
    rank: "OSSC Sub-Inspector",
    examCategory: "ossc",
    story: "SI test analysis options layout simplified key concepts. Daily sectional practice in English paper helped a lot.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Swadhin",
    stats: { score: "228 / 300", accuracy: "90% Accuracy", time: "7 Months Prep" },
    district: "Nayagarh"
  },
  {
    name: "Monika Madhuri Bhol",
    rank: "OSSSC LSI Selected",
    examCategory: "osssc",
    story: "Livestock Inspector biology mocks sets were exact to the point. Practice sets covered all state board class 10 standard topics.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Monika",
    stats: { score: "92 / 120", accuracy: "93% Accuracy", time: "5 Months Prep" },
    district: "Bhadrak"
  },
  {
    name: "Subhendu Sekhar Giri",
    rank: "OPSC OAS Candidate",
    examCategory: "opsc",
    story: "Prelims GS papers analysis report re clear categorization thila. Strong and weak sections are automatically highlighted.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Subhendu",
    stats: { score: "119 / 200", accuracy: "87% Accuracy", time: "9 Months Prep" },
    district: "Balasore"
  },
  {
    name: "Niharika Priyadarshini",
    rank: "OSSSC Amin Aspirant",
    examCategory: "osssc",
    story: "Keonjhar town re preparation pain study material thila. The daily free practice tests provided consistency.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Niharika",
    stats: { score: "71.5 / 100", accuracy: "89% Accuracy", time: "4 Months Prep" },
    district: "Keonjhar"
  },
  {
    name: "Amit Kumar Pradhan",
    rank: "OSSC CGL Candidate",
    examCategory: "ossc",
    story: "Reasoning section logic models in test series clear doubts. Blood relation and puzzle section options are great.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Amit",
    stats: { score: "122 / 150", accuracy: "91% Accuracy", time: "6 Months Prep" },
    district: "Dhenkanal"
  },
  {
    name: "Sarat Chandra Nayak",
    rank: "OSSSC RI Candidate",
    examCategory: "osssc",
    story: "Maths speed weak thila. Target exam practice module and sectional arithmetic sets solved my time lagging issues.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Sarat",
    stats: { score: "139 / 200", accuracy: "90% Accuracy", time: "7 Months Prep" },
    district: "Bolangir"
  },
  {
    name: "Pooja Purnima Das",
    rank: "OSSC CGL Selected",
    examCategory: "ossc",
    story: "The performance dashboard maps progress beautifully. Solved all previous year papers in real-time mode.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Pooja",
    stats: { score: "134 / 150", accuracy: "92% Accuracy", time: "8 Months Prep" },
    district: "Jajpur"
  },
  {
    name: "Rudra Narayan Acharya",
    rank: "OPSC OAS Candidate",
    examCategory: "opsc",
    story: "OAS mains paper preparation re standard questions thila. Special focus on Odisha economy and state welfare schemes.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Rudra",
    stats: { score: "322 / 600", accuracy: "86% Accuracy", time: "1.5 Years Prep" },
    district: "Cuttack"
  },
  {
    name: "Tapaswini Maharana",
    rank: "OSSSC RI Selected",
    examCategory: "osssc",
    story: "Berhampur University study circle re amiti preparation test series search karuthilu. Very helpful for group study rankings.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Tapaswini",
    stats: { score: "149 / 200", accuracy: "94% Accuracy", time: "6 Months Prep" },
    district: "Berhampur"
  },
  {
    name: "Rakesh Kumar Swain",
    rank: "OSSSC Amin Candidate",
    examCategory: "osssc",
    story: "Easy interface compared to other test portals. Best part is it loads quickly on mobile even in rural areas.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Rakesh",
    stats: { score: "74 / 100", accuracy: "91% Accuracy", time: "3 Months Prep" },
    district: "Bhubaneswar"
  },
  {
    name: "Itishree Priyadarsini",
    rank: "OPSC OAS Candidate",
    examCategory: "opsc",
    story: "Ethics case studies compilation in OAS Mains mocks is very premium. Model answers standard is high.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Itishree",
    stats: { score: "118 / 200", accuracy: "85% Accuracy", time: "1 Year Prep" },
    district: "Khurda"
  },
  {
    name: "Satya Ranjan Sahoo",
    rank: "OSSC CGL Candidate",
    examCategory: "ossc",
    story: "English Section errors correction mocks were exactly on target. Active and passive voice logic was explained nicely.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Satya",
    stats: { score: "129 / 150", accuracy: "90% Accuracy", time: "5 Months Prep" },
    district: "Bhadrak"
  },
  {
    name: "Madhusmita Nayak",
    rank: "OSSSC ARI Selected",
    examCategory: "osssc",
    story: "Mock exams layout exact matching of official exam dashboard thila. Exam hall anxiety level down hela daily practice pare.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Madhusmita",
    stats: { score: "141.5 / 200", accuracy: "93% Accuracy", time: "6 Months Prep" },
    district: "Balasore"
  },
  {
    name: "Manoranjan Kar",
    rank: "OPSC Civil Services Selected",
    examCategory: "opsc",
    story: "Very focused test series. Mapped strictly to the revised syllabus guidelines. No unnecessary fluff.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Manoranjan",
    stats: { score: "126 / 200", accuracy: "90% Accuracy", time: "8 Months Prep" },
    district: "Sambalpur"
  },
  {
    name: "Kshirod Chandra Malik",
    rank: "OSSC CGL Candidate",
    examCategory: "ossc",
    story: "Audit Officer and Assistant Revenue Officer mocks syllabus topic layout was detailed and up-to-date.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Kshirod",
    stats: { score: "127 / 150", accuracy: "88% Accuracy", time: "6 Months Prep" },
    district: "Jajpur"
  },
  {
    name: "Laxmipriya Mohanty",
    rank: "OSSSC Amin Candidate",
    examCategory: "osssc",
    story: "Arithmetic chapters decimal fractions & percentage practice sets are very useful for speed calculation.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Laxmipriya",
    stats: { score: "69.5 / 100", accuracy: "89% Accuracy", time: "3 Months Prep" },
    district: "Puri"
  },
  {
    name: "Jajati Keshari Mohapatra",
    rank: "OPSC OAS Aspirant",
    examCategory: "opsc",
    story: "The prelims answer key explanation documents are detailed. Found specific citations of standard textbook history chapters.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Jajati",
    stats: { score: "121.8 / 200", accuracy: "88% Accuracy", time: "1 Year Prep" },
    district: "Cuttack"
  },
  {
    name: "Ananya Aparajita",
    rank: "OSSC CGL Selected",
    examCategory: "ossc",
    story: "Comprehensive mock test score accuracy dashboard helped me improve. I got selected in my second attempt.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Ananya",
    stats: { score: "135 / 150", accuracy: "92% Accuracy", time: "9 Months Prep" },
    district: "Bhubaneswar"
  },
  {
    name: "Saroj Kumar Das",
    rank: "OSSSC RI Aspirant",
    examCategory: "osssc",
    story: "General knowledge section covers modern Odisha current updates in detail. Very helpful for oral rounds too.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Saroj",
    stats: { score: "133 / 200", accuracy: "87% Accuracy", time: "6 Months Prep" },
    district: "Ganjam"
  },
  {
    name: "Rutuparna Baral",
    rank: "OSSSC Amin Selected",
    examCategory: "osssc",
    story: "Highly recommended Amin test sets. Explanations are simple and cover all base formulas.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Rutuparna",
    stats: { score: "75.5 / 100", accuracy: "91% Accuracy", time: "4 Months Prep" },
    district: "Kendrapara"
  },
  {
    name: "Hrudananda Mahapatra",
    rank: "OPSC OAS Candidate",
    examCategory: "opsc",
    story: "Excellent customer support and test correction cycles. The feedback logs are addressed by expert teachers.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Hrudananda",
    stats: { score: "129 / 200", accuracy: "89% Accuracy", time: "1.2 Years Prep" },
    district: "Bhubaneswar"
  },
  {
    name: "Lipika Priyadarsini",
    rank: "OSSC CGL Candidate",
    examCategory: "ossc",
    story: "Mock exams interface mimics actual OSSC screens, making it very comfortable on real exam day.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Lipika",
    stats: { score: "131 / 150", accuracy: "90% Accuracy", time: "5 Months Prep" },
    district: "Bhadrak"
  },
  {
    name: "Sameer Ranjan Prusty",
    rank: "OSSSC RI Candidate",
    examCategory: "osssc",
    story: "Mensuration questions sets inside RI tests were of exact board standard. Highly descriptive answers.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Sameer",
    stats: { score: "140 / 200", accuracy: "91% Accuracy", time: "7 Months Prep" },
    district: "Jajpur"
  },
  {
    name: "Soubhagya Laxmi Das",
    rank: "OSSSC Amin Selected",
    examCategory: "osssc",
    story: "Best online tests for Amin cadre. The syllabus mappings made it very easy to focus on weak topics.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Soubhagya",
    stats: { score: "77 / 100", accuracy: "90% Accuracy", time: "4 Months Prep" },
    district: "Balasore"
  },
  {
    name: "Bimal Prasad Sahu",
    rank: "OPSC OAS Candidate",
    examCategory: "opsc",
    story: "Highly structured test platform. The calendar schedules kept my daily goals on track.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Bimal",
    stats: { score: "124.5 / 200", accuracy: "88% Accuracy", time: "10 Months Prep" },
    district: "Sambalpur"
  },
  {
    name: "Subrat Kumar Pati",
    rank: "OSSC CGL Candidate",
    examCategory: "ossc",
    story: "Sectional mock tests are great for daily brush-up of core rules in quant and reasoning.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Subrat",
    stats: { score: "126 / 150", accuracy: "89% Accuracy", time: "6 Months Prep" },
    district: "Balasore"
  },
  {
    name: "Pratima Pradhan",
    rank: "OSSSC RI Selected",
    examCategory: "osssc",
    story: "Excellent mock tests. Computer section mock quizzes helped me secure higher marks in the RI mains.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Pratima",
    stats: { score: "145 / 200", accuracy: "93% Accuracy", time: "8 Months Prep" },
    district: "Jajpur"
  },
  {
    name: "Manoj Kumar Behera",
    rank: "OSSSC Amin Candidate",
    examCategory: "osssc",
    story: "Simple test layout, easy navigation, and clear analytics. Recommended for rural student circles.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Manoj",
    stats: { score: "72 / 100", accuracy: "88% Accuracy", time: "4 Months Prep" },
    district: "Khurda"
  },
  {
    name: "Srikant Kumar Panda",
    rank: "OPSC OAS Candidate",
    examCategory: "opsc",
    story: "The essay writing tips and general studies test series gave a real competitive edge.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Srikant",
    stats: { score: "130.5 / 200", accuracy: "90% Accuracy", time: "1 Year Prep" },
    district: "Berhampur"
  },
  {
    name: "Rashmita Rani Mohapatra",
    rank: "OSSC CGL Candidate",
    examCategory: "ossc",
    story: "Quant questions shortcuts were very helpful. Daily assessment test series are accurate.",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Rashmita",
    stats: { score: "123 / 150", accuracy: "87% Accuracy", time: "6 Months Prep" },
    district: "Jagatsinghpur"
  }
];
