// GENERATED — do not edit by hand. Regenerate from the v3 dashboard script
// (dashboards/.gen/VCG_Productivity_Center.js, extracted from "VCG_Productivity_Center (3).html")
// by evaluating its data-definition block in node:vm and serialising the constants.
// Snapshot of the VCG Intranet Airtable base (appLH1D7ME6mU1zgE). Current week = Week 39 (Sep 21–25, 2026).
// Tables: Team Members ("Currently Working"), Weekly Schedules, Task Checklists, Master Reports,
// Tasks Planning ("Due This Month" totals). Plain-text labels have "&amp;" unescaped; report
// HTML is trusted, ANT-generated content and stays HTML.
import type {
  ChecklistRecord,
  DirectoryEntry,
  MasterReport,
  Member,
  ReportContent,
  Schedule,
} from "./productivity-types";

export const ACTIVE_MEMBERS: Member[] = [
  {"id":"rec0dwiLQtW5tD3nN","name":"Isis Darks","role":"CEO","dept":"Executive","teamId":200,"weeklyHours":20,"initials":"ID"},
  {"id":"recCeKG4ink7p4RdM","name":"Zaid Habib Qureshi","role":"Operations Manager","dept":"Operations","teamId":102,"weeklyHours":6,"initials":"ZH"},
  {"id":"recLa7OmX91P2fQfy","name":"ANT","role":"ANT","dept":"ANT","teamId":300,"weeklyHours":null,"initials":"ANT"},
  {"id":"recPau3EnRqhdAwfD","name":"Bamidele Eribo","role":"Technical Officer","dept":"Product","teamId":204,"weeklyHours":7,"initials":"BE"},
  {"id":"recWZaXRHwxlry77z","name":"Maaz Khurshid","role":"Developer","dept":"Product","teamId":401,"weeklyHours":30,"initials":"MK"},
  {"id":"recduGv4BHv8CKIBk","name":"Eloisa Melchor","role":"Success Manager","dept":"Success","teamId":101,"weeklyHours":4,"initials":"EM"},
  {"id":"reclLOT1NFonSNhgY","name":"Lola Shonike","role":"Advisor","dept":"Executive","teamId":201,"weeklyHours":1,"initials":"LS"},
];

/** Tasks Planning — "Due This Month" = true (September 2026). */
export const TASKS_THIS_MONTH: { total: number; byStatus: Record<string, number> } = {
  "total": 130,
  "byStatus": {
    "Not Started": 118,
    "In Progress": 4,
    "At Risk": 0,
    "Planning": 0,
    "Completed": 8
  }
};

/** Team Availability — no active member has Start/End times set in Airtable yet. */
export const AVAILABILITY_SET: boolean = false;

/** Team Members directory — every record referenced as a Tasks Planning "Assigned To". */
export const TEAM_MEMBER_DIRECTORY: Record<string, DirectoryEntry> = {
  "rec0dwiLQtW5tD3nN": {
    "name": "Isis Darks",
    "teamMemberId": 200,
    "email": "isis@vcg.media"
  },
  "rec0t7amwMAiRAjZM": {
    "name": "Graphic Designer (CRANT)",
    "teamMemberId": null,
    "email": null
  },
  "rec3U2Q2oFDxVmChQ": {
    "name": "Muhammad Faisal",
    "teamMemberId": 104,
    "email": "mfaisalx2@gmail.com"
  },
  "rec8ZrRyyN5kPCrHI": {
    "name": "Samantha Medallo",
    "teamMemberId": 107,
    "email": "samantha@acrylics.world"
  },
  "rec9fsVhiT1YYB4AI": {
    "name": "Growth Marketing Manager (MANT)",
    "teamMemberId": null,
    "email": null
  },
  "recBHk2OXDJv6tw3f": {
    "name": "Partnerships Manager (MANT)",
    "teamMemberId": null,
    "email": null
  },
  "recCTNFzg2rtanYq8": {
    "name": "Lifecycle Marketing Manager (MANT)",
    "teamMemberId": null,
    "email": null
  },
  "recCeKG4ink7p4RdM": {
    "name": "Zaid Habib Qureshi",
    "teamMemberId": 102,
    "email": "zaid@acrylics.world"
  },
  "recDSOOsOXVcxCQFj": {
    "name": "External",
    "teamMemberId": 400,
    "email": null
  },
  "recE6b4Np70TPlBT8": {
    "name": "Contract & Agreement Manager (LANT)",
    "teamMemberId": null,
    "email": null
  },
  "recEfjAWBpUkAI57s": {
    "name": "Marketing Operations Manager (MANT)",
    "teamMemberId": null,
    "email": null
  },
  "recFHFAI9yjFZy4ut": {
    "name": "Community Manager (COMANT)",
    "teamMemberId": null,
    "email": null
  },
  "recG5FfmNDaxG0vCX": {
    "name": "isisdarks79@gmail.com",
    "teamMemberId": null,
    "email": null
  },
  "recHERj3HZDO2FWT9": {
    "name": "Tax & Compliance Manager (FINANT)",
    "teamMemberId": null,
    "email": null
  },
  "recLYfUygsnyQjfQB": {
    "name": "Content Marketing Manager (MANT)",
    "teamMemberId": null,
    "email": null
  },
  "recLa7OmX91P2fQfy": {
    "name": "ANT",
    "teamMemberId": 300,
    "email": "vcgtracking@gmail.com"
  },
  "recMGAlja8vLyh8kg": {
    "name": "QA & Vendor Operations Manager (PRANT)",
    "teamMemberId": null,
    "email": null
  },
  "recMaHolN3gt00QBf": {
    "name": "maaz.khurshid60@gmail.com",
    "teamMemberId": null,
    "email": null
  },
  "recMcXGccXNR30lPy": {
    "name": "Event Operations Manager (COMANT)",
    "teamMemberId": null,
    "email": null
  },
  "recMx3w9suqgGSlgm": {
    "name": "Sheil Dy",
    "teamMemberId": 108,
    "email": "sheil@vcg.media"
  },
  "recPMB4l8WpmmNVpP": {
    "name": "Isis Darks",
    "teamMemberId": null,
    "email": null
  },
  "recPau3EnRqhdAwfD": {
    "name": "Bamidele Eribo",
    "teamMemberId": 204,
    "email": "delejnr.eribo@gmail.com"
  },
  "recQt6hWUmrpuNZyy": {
    "name": "Precious Adelekan",
    "teamMemberId": 106,
    "email": "precious@vcg.media"
  },
  "recRF44arqffzMA5B": {
    "name": "Milan Limbasiya",
    "teamMemberId": 109,
    "email": "milan@vcg.media"
  },
  "recRuKfR579q5rjBH": {
    "name": "Revenue Operations Analyst (REVANT)",
    "teamMemberId": null,
    "email": null
  },
  "recUZfDoQ1MxUIr0B": {
    "name": "Staff Accountant (FINANT)",
    "teamMemberId": null,
    "email": null
  },
  "recVp1JnWO1BfAFjN": {
    "name": "vcgtracking@gmail.com",
    "teamMemberId": null,
    "email": null
  },
  "recWZaXRHwxlry77z": {
    "name": "Maaz Khurshid",
    "teamMemberId": 401,
    "email": "maaz.khurshid60@gmail.com"
  },
  "recYbKeHNXk2OruCr": {
    "name": "Project Coordinator (OPANT)",
    "teamMemberId": null,
    "email": null
  },
  "recZ4iKfIqqSPAo0E": {
    "name": "zaid@acrylics.world",
    "teamMemberId": null,
    "email": null
  },
  "recaKYJELSudHtHJY": {
    "name": "Portfolio Program Manager (BANT)",
    "teamMemberId": null,
    "email": null
  },
  "recbb8zShAuA1BQGw": {
    "name": "Samantha Rachel",
    "teamMemberId": 105,
    "email": "samantharachel916@gmail.com"
  },
  "reccqGoDAzv7tI104": {
    "name": "Naye Perez",
    "teamMemberId": 202,
    "email": "naye@vcg.media"
  },
  "recduGv4BHv8CKIBk": {
    "name": "Eloisa Melchor",
    "teamMemberId": 101,
    "email": "eloisa@vcg.media"
  },
  "receDBKb4xIskucSr": {
    "name": "Performance Marketing Specialist (MANT)",
    "teamMemberId": 303,
    "email": null
  },
  "rech1dochl0Bhxccu": {
    "name": "Sales Operations Manager (REVANT)",
    "teamMemberId": null,
    "email": null
  },
  "rechg8ANvJBWBRpS6": {
    "name": "Product Experience Manager (PRANT)",
    "teamMemberId": null,
    "email": null
  },
  "recikkunOuavvb3vC": {
    "name": "Customer Success Manager (SUCANT)",
    "teamMemberId": null,
    "email": null
  },
  "reclLOT1NFonSNhgY": {
    "name": "Lola Shonike",
    "teamMemberId": 201,
    "email": "lolashonaike@gmail.com"
  },
  "reclakPUwu7TinlnR": {
    "name": "Product Manager (PRANT)",
    "teamMemberId": 301,
    "email": null
  },
  "recmr6ZB83Q8WlQSf": {
    "name": "Neil Badoy",
    "teamMemberId": 103,
    "email": "neil@acrylics.world"
  },
  "recno39DHUoFiac5i": {
    "name": "eloisa081982@gmail.com",
    "teamMemberId": null,
    "email": null
  },
  "recoXZk4K4GKvNhPX": {
    "name": "Analytics Engineer (BANT)",
    "teamMemberId": null,
    "email": null
  },
  "recoZfL7s33ZgWLmP": {
    "name": "Operations Coordinator (SUCANT)",
    "teamMemberId": null,
    "email": null
  },
  "recrYyXxGGr5omQwY": {
    "name": "FP&A Analyst (FINANT)",
    "teamMemberId": null,
    "email": null
  },
  "recrbpHoRGyU0XOii": {
    "name": "isis@vcg.media",
    "teamMemberId": null,
    "email": null
  },
  "rectUFhauhnOuQOuM": {
    "name": "Growth Lead (MANT)",
    "teamMemberId": 302,
    "email": null
  },
  "reczJx7E6xHZQyvMa": {
    "name": "Technical Program Manager (PRANT)",
    "teamMemberId": null,
    "email": null
  }
};

/** Weekly Schedules — Is Current Week = true (Week 39). */
export const SCHEDULES: Schedule[] = [
  {
    "id": "recF5VU4WTsWUA2QG",
    "memberId": "recduGv4BHv8CKIBk",
    "member": "Eloisa Melchor",
    "initials": "EM",
    "weekId": "Week 39 - Eloisa M.",
    "weekStart": "2026-09-21",
    "hours": 3,
    "checklistId": "39.9101",
    "tasks": []
  },
  {
    "id": "recGooQUIv4nOKU1w",
    "memberId": "recLa7OmX91P2fQfy",
    "member": "ANT",
    "initials": "ANT",
    "weekId": "Week 39 - ANT",
    "weekStart": "2026-09-21",
    "hours": 25,
    "checklistId": "39.9300",
    "tasks": [
      {
        "label": "Run Weekly Pulse data pull & Master Reports refresh (Week 39)",
        "type": "Task",
        "status": "In Progress",
        "priority": "Medium",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "notes": "Automation entity — no human weekly-hours value set in Airtable; 25h reflects scheduled automation runtime."
      },
      {
        "label": "Monitor Checklist Activity & flag At Risk items across active roster",
        "type": "Task",
        "status": "Not Started",
        "priority": "Medium",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "notes": ""
      }
    ]
  },
  {
    "id": "recMHmdOR1YqusBc1",
    "memberId": "rec0dwiLQtW5tD3nN",
    "member": "Isis Darks",
    "initials": "ID",
    "weekId": "Week 39 - Isis D.",
    "weekStart": "2026-09-21",
    "hours": 30,
    "checklistId": "39.9200",
    "tasks": [
      {
        "label": "ACRYLICS MVP: UX/UI & Figma Design Direction (Week 39)",
        "type": "Task",
        "status": "Not Started",
        "priority": "Medium",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Design direction — Post-Launch Stabilization sprint."
      },
      {
        "label": "Review Week 39 Sprint/Product Review recording + progress report",
        "type": "Task",
        "status": "Not Started",
        "priority": "Medium",
        "start": "2026-09-25",
        "due": "2026-09-25",
        "details": "Review-and-approve checkpoint only."
      },
      {
        "label": "Weekly Sprint Facilitation, Team Sync & Strategy Review (Week 39)",
        "type": "Task",
        "status": "Not Started",
        "priority": "Medium",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Facilitate stabilization sprint meeting + team sync."
      }
    ]
  },
  {
    "id": "recbjdoS53rUlYLLi",
    "memberId": "reclLOT1NFonSNhgY",
    "member": "Lola Shonike",
    "initials": "LS",
    "weekId": "Week 39 - Lola S.",
    "weekStart": "2026-09-21",
    "hours": 0,
    "checklistId": "39.9201",
    "tasks": []
  },
  {
    "id": "receT1kQFjToUHGJb",
    "memberId": "recCeKG4ink7p4RdM",
    "member": "Zaid Habib Qureshi",
    "initials": "ZQ",
    "weekId": "Week 39 - Zaid H.",
    "weekStart": "2026-09-21",
    "hours": 5,
    "checklistId": "39.9102",
    "tasks": [
      {
        "label": "Analyze performance metrics.",
        "type": "Roadmap",
        "status": "Completed",
        "priority": "Low",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Outcome: Metrics synthesized. Deliverable: Analytics Report. Brief ref: Launch Plan."
      }
    ]
  },
  {
    "id": "recf9NXQXTPI8lIH3",
    "memberId": "recmr6ZB83Q8WlQSf",
    "member": "Neil Badoy",
    "initials": "NB",
    "weekId": "Week 39 - Neil B.",
    "weekStart": "2026-09-21",
    "hours": null,
    "checklistId": null,
    "tasks": []
  },
  {
    "id": "recmuFiNgd9Azk48U",
    "memberId": "rec8ZrRyyN5kPCrHI",
    "member": "Samantha Medallo",
    "initials": "SM",
    "weekId": "Week 39 - Samantha M.",
    "weekStart": "2026-09-21",
    "hours": null,
    "checklistId": null,
    "tasks": []
  },
  {
    "id": "recp1GXc61WJRUmyw",
    "memberId": "recPau3EnRqhdAwfD",
    "member": "Bamidele Eribo",
    "initials": "BE",
    "weekId": "Week 39 - Bamidele E.",
    "weekStart": "2026-09-21",
    "hours": 7,
    "checklistId": "39.9204",
    "tasks": []
  },
  {
    "id": "recrSEbDqkWB5Sa3K",
    "memberId": "recbb8zShAuA1BQGw",
    "member": "Samantha Rachel",
    "initials": "SR",
    "weekId": "Week 39 - Samantha R.",
    "weekStart": "2026-09-21",
    "hours": null,
    "checklistId": null,
    "tasks": []
  },
  {
    "id": "recxs38EEa9o3NxtR",
    "memberId": "recWZaXRHwxlry77z",
    "member": "Maaz Khurshid",
    "initials": "MK",
    "weekId": "Week 39 - Maaz K.",
    "weekStart": "2026-09-21",
    "hours": 25,
    "checklistId": "39.9401",
    "tasks": [
      {
        "label": "[BE] Build B2B trends data model and access controls",
        "type": "Roadmap",
        "status": "Not Started",
        "priority": "Low",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Outcome: B2B data model live. Deliverable: B2B Trends data model + access controls. Brief ref: Roadmap Week 8 / M2 Brief."
      },
      {
        "label": "[FE] Build Advanced Business Tools — Inventory Management page",
        "type": "Roadmap",
        "status": "Not Started",
        "priority": "Low",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Outcome: Inventory Management page live. Brief ref: Roadmap Week 8 / M2."
      },
      {
        "label": "[FE] Build Advanced Business Tools — Commission Rules page",
        "type": "Roadmap",
        "status": "Not Started",
        "priority": "Low",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Outcome: Commission Rules page live. Brief ref: Roadmap Week 8 / M2."
      },
      {
        "label": "[FE] Build advanced business tools pages: CRM, inventory management, commission rules, AI marketing assistant",
        "type": "Roadmap",
        "status": "Not Started",
        "priority": "Low",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Outcome: Advanced EOS UI live. Deliverable: CRM/inventory/commission/AI assistant pages."
      },
      {
        "label": "[FE] Build Advanced Business Tools — CRM page",
        "type": "Roadmap",
        "status": "Not Started",
        "priority": "Low",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Outcome: CRM page live. Brief ref: Roadmap Week 8 / M2."
      },
      {
        "label": "[FE] Build Advanced Business Tools — AI Marketing Assistant page",
        "type": "Roadmap",
        "status": "Not Started",
        "priority": "Low",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Outcome: AI Marketing Assistant page live. Brief ref: Roadmap Week 8 / M2."
      },
      {
        "label": "[FE] Build B2B trends license info page",
        "type": "Roadmap",
        "status": "Not Started",
        "priority": "Low",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Outcome: B2B license page live. Deliverable: B2B Trends license info page."
      },
      {
        "label": "[Both] Cross-browser regression testing (Chrome, Safari, Firefox, mobile)",
        "type": "Roadmap",
        "status": "Not Started",
        "priority": "Low",
        "start": "2026-09-21",
        "due": "2026-09-25",
        "details": "Outcome: Regression testing complete."
      }
    ]
  }
];

/** Task Checklists — Week 39. "submitted" starts false; only explicit Submit counts. */
export const CHECKLISTS: ChecklistRecord[] = [
  {
    "id": "recFUVVFly5MD713u",
    "checklistId": "39.9200",
    "member": "Isis Darks",
    "approval": "Not Started",
    "submitted": false,
    "submittedAt": null,
    "summary": "",
    "items": [
      {
        "label": "ACRYLICS MVP: UX/UI & Figma Design Direction (Week 39)",
        "done": false,
        "notes": "",
        "edit": {
          "status": "Not Started",
          "priority": "Medium",
          "due": "2026-09-25",
          "notes": "Design direction — Post-Launch Stabilization sprint."
        }
      },
      {
        "label": "Review Week 39 Sprint/Product Review recording + progress report",
        "done": false,
        "notes": "",
        "edit": {
          "status": "Not Started",
          "priority": "Medium",
          "due": "2026-09-25",
          "notes": "Review-and-approve checkpoint only."
        }
      },
      {
        "label": "Weekly Sprint Facilitation, Team Sync & Strategy Review (Week 39)",
        "done": false,
        "notes": "",
        "edit": {
          "status": "Not Started",
          "priority": "Medium",
          "due": "2026-09-25",
          "notes": "Facilitate stabilization sprint meeting + team sync."
        }
      }
    ],
    "managerNotes": ""
  },
  {
    "id": "recMZlMS0CETgC55k",
    "checklistId": "39.9204",
    "member": "Bamidele Eribo",
    "approval": "Not Started",
    "submitted": false,
    "submittedAt": null,
    "summary": "",
    "items": [],
    "managerNotes": ""
  },
  {
    "id": "recWOT36hMipTgdBL",
    "checklistId": "39.9401",
    "member": "Maaz Khurshid",
    "approval": "Not Started",
    "submitted": false,
    "submittedAt": null,
    "summary": "Weekly Task Checklist Summary for Maaz Khurshid:\n\n- [BE] Build B2B trends data model and access controls: In Progress\n- [FE] Build Advanced Business Tools — Inventory Management page: Completed\n- [FE] Build Advanced Business Tools — Commission Rules page: In Progress\n- [FE] Build advanced business tools pages: CRM, inventory management, commission rules, AI marketing assistant: Partially Completed (Inventory Management done, others in progress)\n- [FE] Build Advanced Business Tools — CRM page: In Progress\n- [FE] Build Advanced Business Tools — AI Marketing Assistant page: Not Started\n- [FE] Build B2B trends license info page: Not Started\n- [Both] Cross-browser regression testing (Chrome, Safari, Firefox, mobile): Not Started\n\nMaaz Khurshid has completed the Inventory Management page, is progressing on the data model, commission rules, and CRM pages, while other tasks are pending or not started.",
    "items": [
      {
        "label": "[BE] Build B2B trends data model and access controls",
        "done": false,
        "notes": "",
        "edit": {
          "status": "In Progress",
          "priority": "Low",
          "due": "2026-09-25",
          "notes": "Outcome: B2B data model live. Deliverable: B2B Trends data model + access controls. Brief ref: Roadmap Week 8 / M2 Brief."
        }
      },
      {
        "label": "[FE] Build Advanced Business Tools — Inventory Management page",
        "done": true,
        "notes": "",
        "edit": {
          "status": "Completed",
          "priority": "Low",
          "due": "2026-09-25",
          "notes": "Outcome: Inventory Management page live. Brief ref: Roadmap Week 8 / M2."
        }
      },
      {
        "label": "[FE] Build Advanced Business Tools — Commission Rules page",
        "done": false,
        "notes": "",
        "edit": {
          "status": "In Progress",
          "priority": "Low",
          "due": "2026-09-25",
          "notes": "Outcome: Commission Rules page live. Brief ref: Roadmap Week 8 / M2."
        }
      },
      {
        "label": "[FE] Build advanced business tools pages: CRM, inventory management, commission rules, AI marketing assistant",
        "done": false,
        "notes": "",
        "edit": {
          "status": "In Progress",
          "priority": "Low",
          "due": "2026-09-25",
          "notes": "Outcome: Advanced EOS UI live. Deliverable: CRM/inventory/commission/AI assistant pages."
        }
      },
      {
        "label": "[FE] Build Advanced Business Tools — CRM page",
        "done": false,
        "notes": "",
        "edit": {
          "status": "In Progress",
          "priority": "Low",
          "due": "2026-09-25",
          "notes": "Outcome: CRM page live. Brief ref: Roadmap Week 8 / M2."
        }
      },
      {
        "label": "[FE] Build Advanced Business Tools — AI Marketing Assistant page",
        "done": false,
        "notes": "",
        "edit": {
          "status": "Not Started",
          "priority": "Low",
          "due": "2026-09-25",
          "notes": "Outcome: AI Marketing Assistant page live. Brief ref: Roadmap Week 8 / M2."
        }
      },
      {
        "label": "[FE] Build B2B trends license info page",
        "done": false,
        "notes": "",
        "edit": {
          "status": "Not Started",
          "priority": "Low",
          "due": "2026-09-25",
          "notes": "Outcome: B2B license page live. Deliverable: B2B Trends license info page."
        }
      },
      {
        "label": "[Both] Cross-browser regression testing (Chrome, Safari, Firefox, mobile)",
        "done": false,
        "notes": "",
        "edit": {
          "status": "Not Started",
          "priority": "Low",
          "due": "2026-09-25",
          "notes": "Outcome: Regression testing complete."
        }
      }
    ],
    "managerNotes": ""
  },
  {
    "id": "recfbCz7iqRC4uzby",
    "checklistId": "39.9201",
    "member": "Lola Shonike",
    "approval": "Not Started",
    "submitted": false,
    "submittedAt": null,
    "summary": "Weekly Task Checklist Summary:\n\n- Task: Collect user feedback\n- Assigned to: Lola Shonike\n- Status: In Progress\n- Completion Progress: 60%\n- Notes: Lola has gathered initial feedback from 3 out of 5 user groups; awaiting responses from the remaining groups.",
    "items": [
      {
        "label": "Collect user feedback.",
        "done": false,
        "notes": "",
        "edit": {
          "status": "In Progress",
          "priority": "Medium",
          "due": "2026-09-25",
          "notes": "3 of 5 user groups responded so far; awaiting the rest."
        }
      }
    ],
    "managerNotes": ""
  },
  {
    "id": "recu62f2BZAa8bH3W",
    "checklistId": "39.9102",
    "member": "Zaid Habib Qureshi",
    "approval": "Not Started",
    "submitted": false,
    "submittedAt": null,
    "summary": "Weekly Task Checklist Summary for Zaid Habib Qureshi:\n\n- Task: Analyze performance metrics\n- Status: In Progress\n- Completion Progress: 60% complete\n- Notes: On track, no blockers reported.",
    "items": [
      {
        "label": "Analyze performance metrics.",
        "done": true,
        "notes": "",
        "edit": {
          "status": "Completed",
          "priority": "Low",
          "due": "2026-09-25",
          "notes": "Outcome: Metrics synthesized. Deliverable: Analytics Report. Brief ref: Launch Plan."
        }
      }
    ],
    "managerNotes": ""
  },
  {
    "id": "recx1bUW1xvcPQR2k",
    "checklistId": "39.9101",
    "member": "Eloisa Melchor",
    "approval": "Not Started",
    "submitted": false,
    "submittedAt": null,
    "summary": "",
    "items": [],
    "managerNotes": ""
  }
];

/** Master Reports table — full 35-record list, enriched with Week Number / Reporting Period / Prepared By / Approved. */
export const MASTER_REPORTS: MasterReport[] = [
  {"id":"recRFR4TWrrPjZmQ4","title":"Weekly Pulse Report — Week 39 (Sep 21–25)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-09-21","status":"Not Started","hasContent":false,"weekNumber":39,"preparedBy":"ANT","reportingPeriod":"Week 39 (Sep 21 – Sep 25)","approved":false},
  {"id":"recKSFiBkf2HhJCd8","title":"Weekly Pulse | Week 32","type":"WEEKLY PULSE","dept":"Executive","date":"2026-08-01","status":"In Progress","hasContent":true,"contentKey":"pulse32","weekNumber":32,"preparedBy":"ANT","reportingPeriod":"Week 32 (Aug 1 – Aug 5)","approved":false},
  {"id":"rec6iCEVE3U5tqoBh","title":"VCG Pulse | Week 28","type":"WEEKLY PULSE","dept":"Executive","date":"2024-03-22","status":"Approved","hasContent":true,"contentKey":"ant28","weekNumber":28,"preparedBy":"ANT","reportingPeriod":"Week 28 (Mar 22 – Mar 26)","approved":true},
  {"id":"recWk36Placeholder","title":"Weekly Pulse Report — Week 36 (Aug 31–Sep 4)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-08-31","status":"Approved","hasContent":false,"weekNumber":36,"preparedBy":"ANT","reportingPeriod":"Week 36 (Aug 31 – Sep 4)","approved":true},
  {"id":"recMorningBrief917","title":"Morning Brief — 9.17.26","type":"MORNING BRIEF","dept":"Executive","date":"2026-09-17","status":"Ready for Review","hasContent":false,"weekNumber":null,"preparedBy":"Isis Darks","reportingPeriod":"As of Sep 17","approved":false},
  {"id":"recMorningBrief97","title":"Morning Brief — 9.7.26","type":"MORNING BRIEF","dept":"Executive","date":"2026-09-07","status":"Ready for Review","hasContent":false,"weekNumber":null,"preparedBy":"Isis Darks","reportingPeriod":"As of Sep 7","approved":false},
  {"id":"recPoliciesResearch","title":"Policies Research Report | 09.13.26","type":"RESEARCH REPORT","dept":"Legal & Compliance","date":"2026-09-13","status":"Ready for Review","hasContent":false,"weekNumber":null,"preparedBy":"— (no active Team Member row for this department)","reportingPeriod":"As of Sep 13","approved":false},
  {"id":"recMonthlySuccessAug","title":"Monthly Success Report — August 2026","type":"SUCCESS","dept":"Success","date":"2026-08-31","status":"In Progress","hasContent":false,"weekNumber":null,"preparedBy":"Eloisa Melchor","reportingPeriod":"As of Aug 31","approved":false},
  {"id":"recAcrylicsPricing","title":"ACRYLICS Tutorial Video Pricing & Monetization Strategy","type":"PRODUCT","dept":"Product","date":"2026-08-20","status":"Ready for Review","hasContent":false,"weekNumber":null,"preparedBy":"Maaz Khurshid","reportingPeriod":"As of Aug 20","approved":false},
  {"id":"recCEOWeek34Test","title":"CEO Report — Week 34 (8.18.26) — TEST RUN","type":"CEO REPORT","dept":"Executive","date":"2026-08-18","status":"In Progress","hasContent":false,"weekNumber":null,"preparedBy":"Isis Darks","reportingPeriod":"As of Aug 18","approved":false},
  {"id":"recPulseWeek31","title":"Weekly Pulse | Week 31","type":"WEEKLY PULSE","dept":"Executive","date":"2026-07-27","status":"Approved","hasContent":false,"weekNumber":31,"preparedBy":"ANT","reportingPeriod":"Week 31 (Jul 27 – Jul 31)","approved":true},
  {"id":"recWeek29Perf","title":"Week 29 Performance Report","type":"PERFORMANCE","dept":"Operations","date":"2026-07-13","status":"In Progress","hasContent":false,"weekNumber":null,"preparedBy":"Zaid Habib Qureshi","reportingPeriod":"As of Jul 13","approved":false},
  {"id":"recQ2PerfReport","title":"Q2 Performance Report Report","type":"PERFORMANCE","dept":"Operations","date":"2024-04-05","status":"Not Started","hasContent":false,"weekNumber":null,"preparedBy":"Zaid Habib Qureshi","reportingPeriod":"As of Apr 5","approved":false},
  {"id":"recMarch2024Perf","title":"March 2024 Performance Report","type":"PERFORMANCE","dept":"Operations","date":"2024-03-01","status":"Not Started","hasContent":false,"weekNumber":null,"preparedBy":"Zaid Habib Qureshi","reportingPeriod":"As of Mar 1","approved":false},
  {"id":"recQ1PerfReport","title":"Q1 Performance Report","type":"PERFORMANCE","dept":"Operations","date":"2024-01-31","status":"Not Started","hasContent":false,"weekNumber":null,"preparedBy":"Zaid Habib Qureshi","reportingPeriod":"As of Jan 31","approved":false},
  {"id":"recEBITDAPending","title":"EBITDA Report — Pending First Actuals","type":"FINANCIAL","dept":"Finance","date":"2026-06-01","status":"Not Started","hasContent":false,"weekNumber":null,"preparedBy":"— (no active Team Member row for this department)","reportingPeriod":"As of Jun 1","approved":false},
  {"id":"recMktgCourseBreakdown","title":"Performance Marketing Course Breakdown & ACRYLICS GTM Strategy","type":"RESEARCH REPORT","dept":"Marketing & Sales","date":"2026-05-15","status":"Ready for Review","hasContent":false,"weekNumber":null,"preparedBy":"— (no active Team Member row for this department)","reportingPeriod":"As of May 15","approved":false},
  {"id":"recWeeklyPulseWk33","title":"Weekly Pulse Report — Week 33 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-08-10","status":"Not Started","hasContent":false,"weekNumber":33,"preparedBy":"ANT","reportingPeriod":"Week 33 (Aug 10 – Aug 14)","approved":false},
  {"id":"recWeeklyPulseWk34","title":"Weekly Pulse Report — Week 34 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-08-17","status":"Not Started","hasContent":false,"weekNumber":34,"preparedBy":"ANT","reportingPeriod":"Week 34 (Aug 17 – Aug 21)","approved":false},
  {"id":"recWeeklyPulseWk35","title":"Weekly Pulse Report — Week 35 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-08-24","status":"Not Started","hasContent":false,"weekNumber":35,"preparedBy":"ANT","reportingPeriod":"Week 35 (Aug 24 – Aug 28)","approved":false},
  {"id":"recWeeklyPulseWk37","title":"Weekly Pulse Report — Week 37 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-09-07","status":"Not Started","hasContent":false,"weekNumber":37,"preparedBy":"ANT","reportingPeriod":"Week 37 (Sep 7 – Sep 11)","approved":false},
  {"id":"recWeeklyPulseWk38","title":"Weekly Pulse Report — Week 38 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-09-14","status":"Not Started","hasContent":false,"weekNumber":38,"preparedBy":"ANT","reportingPeriod":"Week 38 (Sep 14 – Sep 18)","approved":false},
  {"id":"recWeeklyPulseWk40","title":"Weekly Pulse Report — Week 40 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-09-28","status":"Not Started","hasContent":false,"weekNumber":40,"preparedBy":"ANT","reportingPeriod":"Week 40 (Sep 28 – Oct 2)","approved":false},
  {"id":"recWeeklyPulseWk41","title":"Weekly Pulse Report — Week 41 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-10-05","status":"Not Started","hasContent":false,"weekNumber":41,"preparedBy":"ANT","reportingPeriod":"Week 41 (Oct 5 – Oct 9)","approved":false},
  {"id":"recWeeklyPulseWk42","title":"Weekly Pulse Report — Week 42 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-10-12","status":"Not Started","hasContent":false,"weekNumber":42,"preparedBy":"ANT","reportingPeriod":"Week 42 (Oct 12 – Oct 16)","approved":false},
  {"id":"recWeeklyPulseWk43","title":"Weekly Pulse Report — Week 43 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-10-19","status":"Not Started","hasContent":false,"weekNumber":43,"preparedBy":"ANT","reportingPeriod":"Week 43 (Oct 19 – Oct 23)","approved":false},
  {"id":"recWeeklyPulseWk44","title":"Weekly Pulse Report — Week 44 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-10-26","status":"Not Started","hasContent":false,"weekNumber":44,"preparedBy":"ANT","reportingPeriod":"Week 44 (Oct 26 – Oct 30)","approved":false},
  {"id":"recWeeklyPulseWk45","title":"Weekly Pulse Report — Week 45 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-11-02","status":"Not Started","hasContent":false,"weekNumber":45,"preparedBy":"ANT","reportingPeriod":"Week 45 (Nov 2 – Nov 6)","approved":false},
  {"id":"recWeeklyPulseWk46","title":"Weekly Pulse Report — Week 46 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-11-09","status":"Not Started","hasContent":false,"weekNumber":46,"preparedBy":"ANT","reportingPeriod":"Week 46 (Nov 9 – Nov 13)","approved":false},
  {"id":"recWeeklyPulseWk47","title":"Weekly Pulse Report — Week 47 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-11-16","status":"Not Started","hasContent":false,"weekNumber":47,"preparedBy":"ANT","reportingPeriod":"Week 47 (Nov 16 – Nov 20)","approved":false},
  {"id":"recWeeklyPulseWk48","title":"Weekly Pulse Report — Week 48 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-11-23","status":"Not Started","hasContent":false,"weekNumber":48,"preparedBy":"ANT","reportingPeriod":"Week 48 (Nov 23 – Nov 27)","approved":false},
  {"id":"recWeeklyPulseWk49","title":"Weekly Pulse Report — Week 49 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-11-30","status":"Not Started","hasContent":false,"weekNumber":49,"preparedBy":"ANT","reportingPeriod":"Week 49 (Nov 30 – Dec 4)","approved":false},
  {"id":"recWeeklyPulseWk50","title":"Weekly Pulse Report — Week 50 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-12-07","status":"Not Started","hasContent":false,"weekNumber":50,"preparedBy":"ANT","reportingPeriod":"Week 50 (Dec 7 – Dec 11)","approved":false},
  {"id":"recWeeklyPulseWk51","title":"Weekly Pulse Report — Week 51 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-12-14","status":"Not Started","hasContent":false,"weekNumber":51,"preparedBy":"ANT","reportingPeriod":"Week 51 (Dec 14 – Dec 18)","approved":false},
  {"id":"recWeeklyPulseWk52","title":"Weekly Pulse Report — Week 52 (2026)","type":"WEEKLY PULSE","dept":"Executive","date":"2026-12-21","status":"Not Started","hasContent":false,"weekNumber":52,"preparedBy":"ANT","reportingPeriod":"Week 52 (Dec 21 – Dec 25)","approved":false},
];

export const REPORT_STATUS_OPTIONS: string[] = ["Not Started","In Progress","Ready for Review","Approved"];

/** The 2 Master Reports records with generated report text (trusted HTML). */
export const REPORT_CONTENT: Record<string, ReportContent> = {
  "pulse32": {
    "reportTitle": "Weekly Pulse | Week 32",
    "reportDate": "2026-08-01",
    "html": "<p><strong>Executive Summary:</strong> Team execution continued across Operations, Product, and Success this week, with steady progress against the ACRYLICS MVP build and internal systems work. No blockers were escalated; all three departments report on-track status heading into Week 33.</p>\n<div class=\"rd-heading\">Operations</div>\n<p><strong>Key Updates:</strong> Continued analysis of performance metrics and workflow documentation for the intranet Performance Hub.</p>\n<p><strong>Action Items:</strong> Finalize Week 33 schedule sync; confirm Airtable automation health checks.</p>\n<p><strong>Top Win:</strong> Metrics synthesis completed and folded into the Analytics Report.</p>\n<p><strong>Next Week Priority:</strong> Maintain schedule/checklist sync cadence across the active roster.</p>\n<div class=\"rd-heading\">Product</div>\n<p><strong>Key Updates:</strong> Advanced Business Tools build progressing — Inventory Management page shipped; CRM, Commission Rules, and AI Marketing Assistant pages in progress.</p>\n<p><strong>Action Items:</strong> Complete CRM and Commission Rules pages; begin cross-browser regression testing.</p>\n<p><strong>Top Win:</strong> Inventory Management page completed and verified.</p>\n<p><strong>Next Week Priority:</strong> Close remaining Roadmap Week 8 / M2 items ahead of MVP stabilization.</p>\n<div class=\"rd-heading\">Success</div>\n<p><strong>Key Updates:</strong> User feedback collection in progress — responses received from 3 of 5 user groups.</p>\n<p><strong>Action Items:</strong> Follow up with remaining user groups; compile feedback synthesis.</p>\n<p><strong>Top Win:</strong> Early feedback signal validated core MVP flows.</p>\n<p><strong>Next Week Priority:</strong> Close out feedback collection and share synthesis with Product.</p>\n<div class=\"rd-heading\">Department Productivity &amp; Performance</div>\n<table style=\"width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:10px;\">\n<tr style=\"border-bottom:1px solid var(--border);\"><th style=\"text-align:left; padding:4px;\">Department</th><th style=\"text-align:left; padding:4px;\">Tasks Completed</th><th style=\"text-align:left; padding:4px;\">Status</th></tr>\n<tr style=\"border-bottom:1px solid var(--border-soft);\"><td style=\"padding:4px;\">Operations</td><td style=\"padding:4px;\">1</td><td style=\"padding:4px;\">On Track</td></tr>\n<tr style=\"border-bottom:1px solid var(--border-soft);\"><td style=\"padding:4px;\">Product</td><td style=\"padding:4px;\">1 of 8</td><td style=\"padding:4px;\">In Progress</td></tr>\n<tr><td style=\"padding:4px;\">Success</td><td style=\"padding:4px;\">In Progress (60%)</td><td style=\"padding:4px;\">On Track</td></tr>\n</table>\n<div class=\"rd-heading\">Attachments</div>\n<p style=\"color:var(--text-faint); font-size:11.5px;\">Analytics Report · Week 32 Checklist Summaries (Task Checklists table)</p>\n<div class=\"rd-heading\">Summary Analysis</div>\n<p>Overall momentum held steady with no at-risk items surfaced this week. The team's smallest friction point remains completing the Product roadmap's remaining Advanced Business Tools pages — recommend prioritizing CRM and Commission Rules completion in Week 33 to keep the MVP stabilization sprint on schedule.</p>"
  },
  "ant28": {
    "reportTitle": "VCG Pulse | Week 28",
    "reportDate": "2024-03-22",
    "html": "<p><strong>Strategic Forecast — VCG as a Seed-Stage Startup</strong></p>\n<div class=\"rd-heading\">Success Standards &amp; Internal Frameworks</div>\n<p>Recommend formalizing a lightweight internal framework for what \"success\" means at each department level (Operations, Product, Success) so that weekly checklist completion ties directly to measurable outcomes rather than task volume alone.</p>\n<div class=\"rd-heading\">Weekly Performance Metrics</div>\n<p>Task completion this period skewed toward \"Not Started\" across the active roster, consistent with a small, sporadically-available team. Recommend tracking a rolling 4-week completion rate per member rather than single-week snapshots, which can be misleading at this team size.</p>\n<div class=\"rd-heading\">Team &amp; Accountability</div>\n<p>With a 7-person active roster (including ANT as an automation entity), accountability is best reinforced through the Submit step on each checklist — only submitted checklists should count toward review, since an unsubmitted checklist may simply be a work-in-progress draft.</p>\n<div class=\"rd-heading\">Accelerator Applications</div>\n<p>VCG's current systems (Performance Hub, Task Checklists, Weekly Schedules) are strong evidence for accelerator applications emphasizing operational maturity — recommend packaging a short \"systems overview\" one-pager from this dashboard for that purpose.</p>\n<div class=\"rd-heading\">Risk Management</div>\n<p>Primary risk remains labor-budget volatility (team members' hours fluctuate week to week). Recommend flagging any member with 0 scheduled hours two weeks running as an at-risk capacity gap.</p>\n<div class=\"rd-heading\">Observations</div>\n<p>ANT's own scheduled hours (automation runtime) are the highest of any active member this week, reflecting the degree to which VCG operations already lean on automated systems rather than headcount.</p>\n<div class=\"rd-heading\">Suggestions on Actions</div>\n<p>1) Require checklist submission before a week is marked closed. 2) Review the Master Reports table weekly to ensure Week-N Weekly Pulse records don't go ungenerated for more than one cycle. 3) Continue consolidating fragmented reporting (task summaries + ANT observations) into the single comprehensive report format used here.</p>"
  }
};
