// GENERATED from VCG_PICS_Operations (4).html (.gen/VCG_PICS_Operations.js) — do not hand-edit.
// Snapshot of the VCG Intranet P.I.C.S records (Airtable). Replace with a live fetch through a server route once the Airtable token is wired up.
import type { PicsRecord } from "./types";

export const PICS_SEED: PicsRecord[] = [
  {
    "id": "p1",
    "type": "Project",
    "name": "VCG Restructure",
    "stage": "Execution",
    "depts": [
      "Operations",
      "Finance"
    ],
    "start": "2026-08-03",
    "end": "2026-11-13",
    "leads": [
      {
        "i": "JM"
      },
      {
        "i": "RT"
      }
    ],
    "meetingCount": 3,
    "activityCount": 11,
    "childIds": [
      "p3b"
    ],
    "roadmapRows": [],
    "checklist": []
  },
  {
    "id": "p_launch",
    "type": "Initiative",
    "name": "ACRYLICS MVP Launch",
    "stage": "Ongoing",
    "depts": [
      "Product"
    ],
    "start": "2026-07-20",
    "end": "2026-12-01",
    "leads": [
      {
        "i": "ID"
      },
      {
        "i": "ZQ"
      }
    ],
    "meetingCount": 0,
    "activityCount": 2,
    "childIds": [
      "p2"
    ],
    "roadmapRows": [],
    "checklist": []
  },
  {
    "id": "p2",
    "type": "Project",
    "name": "ACRYLICS MVP Build",
    "stage": "Implementation",
    "depts": [
      "Product"
    ],
    "start": "2026-07-20",
    "end": "2026-12-01",
    "leads": [
      {
        "i": "ID"
      },
      {
        "i": "ZQ"
      }
    ],
    "meetingCount": 19,
    "activityCount": 38,
    "parentId": "p_launch",
    "hierarchy": "Child",
    "childIds": [
      "p2_spider",
      "p2_mkt",
      "p2_disc",
      "p2_comm",
      "p2_post",
      "p2_doc"
    ],
    "roadmapRows": [
      {
        "label": "Auth Module, Role Scaffolding & Design System",
        "type": "Sprint",
        "date": "2026-08-07",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Completed"
      },
      {
        "label": "ACRYLICS Figma access and homepage design",
        "type": "Task",
        "date": "2026-08-07",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Completed"
      },
      {
        "label": "ACR-001 — Design tokens and theme setup",
        "type": "Task",
        "date": "2026-08-07",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Completed"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "type": "Task",
        "date": "2026-08-07",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Completed"
      },
      {
        "label": "ACRYLICS MVP Build Review",
        "type": "Task",
        "date": "2026-08-14",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "In Progress"
      },
      {
        "label": "Search APIs",
        "type": "Sprint",
        "date": "2026-08-14",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Completed"
      },
      {
        "label": "ACRYLICS MVP Build Review",
        "type": "Task",
        "date": "2026-08-14",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "In Progress"
      },
      {
        "label": "ACRYLICS MVP Build Initiation",
        "type": "Task",
        "date": "2026-08-21",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "At Risk"
      },
      {
        "label": "ACRYLICS MVP Build Initiation",
        "type": "Task",
        "date": "2026-08-21",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Completed"
      },
      {
        "label": "ACRYLICS MVP Build Initiation",
        "type": "Task",
        "date": "2026-08-21",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Build Initiation",
        "type": "Task",
        "date": "2026-08-21",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Build Initiation",
        "type": "Task",
        "date": "2026-08-21",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Sprint reviewed, blockers surfaced, next sprint aligned",
        "type": "Meeting",
        "date": "2026-08-21",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Milestone 1 deployment reviewed and approved",
        "type": "Meeting",
        "date": "2026-08-28",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "In Progress"
      },
      {
        "label": "Phase 1 stable",
        "type": "Task",
        "date": "2026-08-28",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Sprint reviewed, blockers surfaced, next sprint aligned",
        "type": "Meeting",
        "date": "2026-08-28",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "In Progress"
      },
      {
        "label": "ACRYLICS MVP Build Initiation",
        "type": "Task",
        "date": "2026-08-28",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "In Progress"
      },
      {
        "label": "ACRYLICS MVP Build Initiation",
        "type": "Task",
        "date": "2026-08-28",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "In Progress"
      },
      {
        "label": "ACRYLICS MVP Build Initiation",
        "type": "Task",
        "date": "2026-08-28",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "In Progress"
      },
      {
        "label": "Tools ready",
        "type": "Sprint",
        "date": "2026-08-28",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Milestone 1 Preview Build",
        "type": "Milestone",
        "date": "2026-09-25",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Community API",
        "type": "Sprint",
        "date": "2026-09-04",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Build Review",
        "type": "Task",
        "date": "2026-09-04",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Sprint reviewed, blockers surfaced, next sprint aligned",
        "type": "Meeting",
        "date": "2026-09-04",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Monetization & Brevo Logic",
        "type": "Sprint",
        "date": "2026-09-11",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Monetization UI",
        "type": "Sprint",
        "date": "2026-09-11",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Sprint reviewed, blockers surfaced, next sprint aligned",
        "type": "Meeting",
        "date": "2026-09-11",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Build Review",
        "type": "Task",
        "date": "2026-09-11",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Advanced Tools & Final Launch Sprint (Milestone 2) — cross-functional roadmap phase.",
        "type": "Sprint",
        "date": "2026-09-18",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Build Review",
        "type": "Task",
        "date": "2026-09-18",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Build Review",
        "type": "Task",
        "date": "2026-09-18",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "EOS tools active",
        "type": "Sprint",
        "date": "2026-09-25",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Milestone 2 Production Build",
        "type": "Milestone",
        "date": "2026-09-25",
        "phase": "Phase 2",
        "stage": "Launch",
        "status": "Not Started"
      },
      {
        "label": "Trends & Intelligence Sprint — cross-functional roadmap phase.",
        "type": "Sprint",
        "date": "2026-10-09",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Post-Launch Stabilization Sprint — cross-functional roadmap phase.",
        "type": "Sprint",
        "date": "2026-09-25",
        "phase": "Phase 3",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Feedback & Metrics Sprint — cross-functional roadmap phase.",
        "type": "Sprint",
        "date": "2026-10-02",
        "phase": "Phase 3",
        "stage": "Engagement & Measurement",
        "status": "Not Started"
      },
      {
        "label": "Post-Deployment Monitoring Report",
        "type": "Sprint",
        "date": "2026-10-02",
        "phase": "Phase 3",
        "stage": "Launch",
        "status": "Not Started"
      },
      {
        "label": "Product Q&A Log",
        "type": "Sprint",
        "date": "2026-10-02",
        "phase": "Phase 3",
        "stage": "Launch",
        "status": "Not Started"
      },
      {
        "label": "User Feedback Log",
        "type": "Sprint",
        "date": "2026-10-09",
        "phase": "Phase 3",
        "stage": "Discovery",
        "status": "Not Started"
      },
      {
        "label": "Performance Tuning Patch",
        "type": "Sprint",
        "date": "2026-10-16",
        "phase": "Phase 3",
        "stage": "Discovery",
        "status": "Not Started"
      },
      {
        "label": "Performance & Bug Resolution Sprint — cross-functional roadmap phase.",
        "type": "Sprint",
        "date": "2026-10-16",
        "phase": "Phase 3",
        "stage": "Execution",
        "status": "Not Started"
      },
      {
        "label": "Project Documentation",
        "type": "Sprint",
        "date": "2026-10-23",
        "phase": "Phase 3",
        "stage": "Discovery",
        "status": "Not Started"
      },
      {
        "label": "Stakeholder Handover Package",
        "type": "Sprint",
        "date": "2026-10-23",
        "phase": "Phase 3",
        "stage": "Discovery",
        "status": "Not Started"
      },
      {
        "label": "Go-to-Market Production Deployment",
        "type": "Milestone",
        "date": "2026-10-30",
        "phase": "Phase 3",
        "stage": "Launch",
        "status": "Not Started"
      },
      {
        "label": "Market Launch deployment reviewed and executed",
        "type": "Meeting",
        "date": "2026-10-30",
        "phase": "Phase 3",
        "stage": "Launch",
        "status": "Not Started"
      },
      {
        "label": "Post-Launch KPI Report",
        "type": "Sprint",
        "date": "2026-11-06",
        "phase": "Phase 3",
        "stage": "Assessment",
        "status": "Not Started"
      }
    ],
    "meetings": [
      {
        "label": "Figma and the ACRYLICS Homepage UX/UI Pass Off",
        "date": "2026-07-30T12:00:00.000Z",
        "link": "https://meet.google.com/kiz-jxyf-ddi",
        "duration": 60,
        "facilitator": "Isis Darks",
        "prepStatus": "Closed"
      },
      {
        "label": "Leadership Sync | 8.10.26",
        "date": "2026-08-10T13:00:00.000Z",
        "link": "https://meet.google.com/ott-cvhk-ztc",
        "duration": 60,
        "facilitator": "Isis Darks",
        "prepStatus": "Closed",
        "objective": "Get into full alignment on P.I.C.S Management, Task Allocation, and Intranet Usage."
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-08-07T13:00:00.000Z",
        "link": "https://meet.google.com/xwo-avxb-xtb",
        "duration": 60,
        "prepStatus": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-08-14T13:00:00.000Z",
        "link": "https://meet.google.com/ywm-psmy-njz",
        "duration": 60,
        "prepStatus": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-08-21T13:00:00.000Z",
        "link": "https://meet.google.com/add-kpjk-ucr",
        "duration": 60,
        "facilitator": "Isis Darks",
        "prepStatus": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-08-28T13:00:00.000Z",
        "link": "https://meet.google.com/xfu-wfmo-hab",
        "duration": 60,
        "prepStatus": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-09-04T13:00:00.000Z",
        "link": "https://meet.google.com/swr-kicz-ogh",
        "duration": 60,
        "prepStatus": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-09-11T13:00:00.000Z",
        "link": "https://meet.google.com/oum-vnjm-dhv",
        "duration": 60,
        "facilitator": "Zaid Habib Qureshi",
        "prepStatus": "Agenda Prep",
        "objective": "Sprint Review — review Weeks 5-6 build progress (community, monetization). Time is a placeholder pending Google Calendar integration."
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-09-18T13:00:00.000Z",
        "link": "https://meet.google.com/qpz-nugg-syr",
        "duration": 60,
        "prepStatus": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-09-25T13:00:00.000Z",
        "link": "https://meet.google.com/fxf-buwb-fdm",
        "duration": 60,
        "facilitator": "Zaid Habib Qureshi",
        "prepStatus": "Not Started",
        "objective": "Sprint Review — review Weeks 7-8 build progress ahead of Milestone 2. Time is a placeholder pending Google Calendar integration."
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-10-02T13:00:00.000Z",
        "link": "https://meet.google.com/rpy-ooja-mzc",
        "duration": 60,
        "prepStatus": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-10-09T13:00:00.000Z",
        "link": "https://meet.google.com/ajx-gjkr-cvy",
        "duration": 60,
        "facilitator": "Zaid Habib Qureshi",
        "prepStatus": "Not Started",
        "objective": "Sprint Review — review post-launch monitoring, Q&A, and early user feedback. Time is a placeholder pending Google Calendar integration."
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-10-16T13:00:00.000Z",
        "link": "https://meet.google.com/tqd-nrhj-dgs",
        "duration": 60,
        "prepStatus": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-10-23T13:00:00.000Z",
        "link": "https://meet.google.com/rqe-ugcq-nrw",
        "duration": 60,
        "facilitator": "Zaid Habib Qureshi",
        "prepStatus": "Not Started",
        "objective": "Sprint Review — review performance tuning, bug triage, documentation, and handover prep ahead of Market Launch. Time is a placeholder pending Google Calendar integration."
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-10-30T13:00:00.000Z",
        "link": "https://meet.google.com/qhk-yvtt-dcu",
        "duration": 60,
        "prepStatus": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-11-06T14:00:00.000Z",
        "link": "https://meet.google.com/hit-znfp-vfx",
        "duration": 60,
        "prepStatus": "Not Started"
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-11-13T14:00:00.000Z",
        "duration": 60
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-11-20T14:00:00.000Z",
        "duration": 60
      },
      {
        "label": "ACRYLICS MVP Sprint Review",
        "date": "2026-12-04T14:00:00.000Z",
        "duration": 60
      }
    ],
    "reviewRounds": [
      {
        "name": "ACRYLICS Phase 1 Review",
        "roundNumber": 1,
        "roundType": "Client Review",
        "status": "In Progress",
        "due": "2026-09-25",
        "reviewer": "Isis Darks",
        "reviewUrl": "https://acrylics-five.vercel.app/",
        "attachment": "ACRYLICS-Phase1-Acceptance-Tests.docx",
        "reviewNotes": "Acceptance-test pass against the 33-item P.I.C.S Checklist (A1–G4) — auth, booking, payments, and marketplace flows.",
        "reviewActions": "Re-test declined-card flow (D3); confirm payout-account connection copy (E1); resolve footer/legal page 404 (G4).",
        "feedbackUrls": [
          "https://acrylics-five.vercel.app/"
        ],
        "activities": [
          {
            "label": "Acceptance-test pass — Auth & onboarding (A1–A6)",
            "status": "In Progress"
          },
          {
            "label": "Acceptance-test pass — Booking & payments (B1–E4)",
            "status": "Not Started"
          },
          {
            "label": "Acceptance-test pass — Community & Help Centre (F1–G4)",
            "status": "Not Started"
          }
        ]
      }
    ],
    "checklist": [
      {
        "item": "D1 — List a product",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "C4 — Walk away from the payment [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "F2 — Check client records",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "G4 — Check the footer and legal pages",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "E4 — Manage your subscription [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "E2 — See what you're owed from a sale [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "C5 — Accept a booking [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "D3 — Try a declined card [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "G2 — Look at the Community page",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "C3 — Book and pay a deposit [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "B2 — Add a service with a deposit",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "C6 — Decline a booking and check the refund [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "D4 — Track the order both ways",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "E1 — Connect your payout account [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "F4 — Invite a team member",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "G1 — Use the Help Centre",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "A2 — Log out and back in",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "D2 — Buy it [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "A5 — Sign up as a business [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "A4 — Sign in with Google",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "F3 — Check the revenue summary",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "F1 — Use the calendar",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "C7 — Cancel as the customer",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "B3 — Set your hours and booking rules",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "B4 — Appear in search",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "B1 — Fill in your storefront",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "A6 — Finish business onboarding",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "A3 — Reset a forgotten password",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "G3 — Open the community channels",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "C2 — Book with no deposit",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "C1 — Find an artist",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "A1 — Sign up as a customer",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      },
      {
        "item": "E3 — See the booking deposit arrive [$ payment]",
        "due": "2026-09-25",
        "done": null,
        "status": "upcoming",
        "taskStatus": "Not Started",
        "itemType": "Deliverable",
        "approvalStatus": "Not Started",
        "assetType": "Feature",
        "complete": false,
        "overdue": false,
        "notes": ""
      }
    ]
  },
  {
    "id": "p2_spider",
    "type": "Sprint",
    "name": "SPIDER Build | ACRYLICS MVP Build",
    "stage": "Not Started",
    "depts": [
      "Product",
      "Engineering"
    ],
    "start": "2026-09-07",
    "end": "2026-10-09",
    "leads": [
      {
        "i": "ZQ"
      }
    ],
    "meetingCount": 1,
    "activityCount": 6,
    "parentId": "p2",
    "hierarchy": "Sub-child",
    "roadmapRows": [],
    "checklist": [
      {
        "item": "SPIDER Build — Supabase Schema & Scheduling Config (Phase 1)",
        "due": "2026-09-11",
        "done": null,
        "status": "overdue"
      },
      {
        "item": "SPIDER Build — Live Scraping Deployment (Phase 1)",
        "due": "2026-09-18",
        "done": null,
        "status": "overdue"
      },
      {
        "item": "SPIDER Build — Cleaned, Enriched, Market-Ready Dataset (Phase 2)",
        "due": "2026-10-02",
        "done": null,
        "status": "upcoming"
      },
      {
        "item": "SPIDER Build — Trends Search & Discovery Live in Market (Phase 2)",
        "due": "2026-10-09",
        "done": null,
        "status": "upcoming"
      }
    ]
  },
  {
    "id": "p2_disc",
    "type": "Sprint",
    "name": "Discovery & Booking | ACRYLICS MVP Build",
    "stage": "Execution",
    "depts": [
      "Product"
    ],
    "start": "2026-08-10",
    "end": "2026-08-14",
    "leads": [
      {
        "i": "ID"
      }
    ],
    "meetingCount": 1,
    "activityCount": 5,
    "parentId": "p2",
    "hierarchy": "Sub-child",
    "roadmapRows": [
      {
        "label": "Search functional",
        "type": "Task",
        "date": "2026-08-13",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Completed"
      },
      {
        "label": "Booking UI ready",
        "type": "Task",
        "date": "2026-08-18",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Completed"
      }
    ],
    "checklist": []
  },
  {
    "id": "p2_mkt",
    "type": "Sprint",
    "name": "Marketplace & Payments | ACRYLICS MVP Build",
    "stage": "Execution",
    "depts": [
      "Product",
      "Engineering"
    ],
    "start": "2026-08-17",
    "end": "2026-08-21",
    "leads": [
      {
        "i": "ZQ"
      }
    ],
    "meetingCount": 1,
    "activityCount": 5,
    "parentId": "p2",
    "hierarchy": "Sub-child",
    "roadmapRows": [
      {
        "label": "Payments functional",
        "type": "Task",
        "date": "2026-08-20",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Completed"
      },
      {
        "label": "Marketplace UI ready",
        "type": "Task",
        "date": "2026-08-25",
        "phase": "Phase 1",
        "stage": "Execution",
        "status": "Completed"
      }
    ],
    "checklist": []
  },
  {
    "id": "p2_comm",
    "type": "Sprint",
    "name": "Community Foundation | ACRYLICS MVP Build",
    "stage": "Execution",
    "depts": [
      "Product"
    ],
    "start": "2026-08-31",
    "end": "2026-09-04",
    "leads": [
      {
        "i": "ID"
      }
    ],
    "meetingCount": 0,
    "activityCount": 4,
    "parentId": "p2",
    "hierarchy": "Sub-child",
    "roadmapRows": [
      {
        "label": "Community API ready",
        "type": "Task",
        "date": "2026-09-08",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "In Review"
      },
      {
        "label": "Community UI ready",
        "type": "Task",
        "date": "2026-09-10",
        "phase": "Phase 2",
        "stage": "Execution",
        "status": "In Review"
      }
    ],
    "checklist": []
  },
  {
    "id": "p2_post",
    "type": "Sprint",
    "name": "Post-Launch Stabilization | ACRYLICS MVP Build",
    "stage": "Not Started",
    "depts": [
      "Product",
      "Engineering"
    ],
    "start": "2026-09-21",
    "end": "2026-09-25",
    "leads": [
      {
        "i": "ZQ"
      }
    ],
    "meetingCount": 0,
    "activityCount": 1,
    "parentId": "p2",
    "hierarchy": "Sub-child",
    "roadmapRows": [],
    "checklist": [
      {
        "item": "Post-Launch Stabilization — Cross-Functional Ops Summary (Phase 3)",
        "due": null,
        "done": null,
        "status": "upcoming"
      }
    ]
  },
  {
    "id": "p2_doc",
    "type": "Sprint",
    "name": "Documentation & Handover | ACRYLICS MVP Build",
    "stage": "Not Started",
    "depts": [
      "Product"
    ],
    "start": "2026-10-19",
    "end": "2026-10-23",
    "leads": [
      {
        "i": "ID"
      }
    ],
    "meetingCount": 0,
    "activityCount": 1,
    "parentId": "p2",
    "hierarchy": "Sub-child",
    "roadmapRows": [],
    "checklist": [
      {
        "item": "Documentation & Handover — Cross-Functional Ops Summary (Phase 3)",
        "due": null,
        "done": null,
        "status": "upcoming"
      }
    ]
  },
  {
    "id": "p3",
    "type": "Initiative",
    "name": "Grant ANT Rollout",
    "stage": "Discovery",
    "depts": [
      "Social Impact"
    ],
    "start": "2026-09-14",
    "end": "2026-12-19",
    "leads": [
      {
        "i": "ID"
      }
    ],
    "meetingCount": 1,
    "activityCount": 2,
    "roadmapRows": [],
    "checklist": []
  },
  {
    "id": "p3b",
    "type": "Initiative",
    "name": "ANT Connector Build",
    "stage": "Facilitation & Negotiation",
    "depts": [
      "Product",
      "Operations"
    ],
    "start": "2026-08-17",
    "end": "2026-08-28",
    "leads": [
      {
        "i": "JM"
      }
    ],
    "meetingCount": 2,
    "activityCount": 14,
    "parentId": "p1",
    "hierarchy": "Child",
    "roadmapRows": [],
    "checklist": []
  },
  {
    "id": "p4",
    "type": "Campaign",
    "name": "Fall Fundraising Campaign",
    "stage": "Assessment",
    "depts": [
      "Development",
      "Marketing"
    ],
    "start": "2026-07-06",
    "end": "2026-09-28",
    "leads": [
      {
        "i": "RT"
      },
      {
        "i": "AL"
      }
    ],
    "meetingCount": 6,
    "activityCount": 22,
    "roadmapRows": [
      {
        "label": "Donor segment list",
        "type": "Task",
        "date": "2026-07-10",
        "phase": "Phase 1",
        "stage": "Discovery",
        "status": "Completed"
      },
      {
        "label": "Campaign brief",
        "type": "Milestone",
        "date": "2026-07-13",
        "phase": "Phase 1",
        "stage": "Strategy & Negotiation",
        "status": "Completed"
      },
      {
        "label": "Sprint — creative",
        "type": "Sprint",
        "date": "2026-07-20",
        "phase": "Phase 2",
        "stage": "Implementation",
        "status": "Completed"
      },
      {
        "label": "Email sequence build",
        "type": "Task",
        "date": "2026-07-27",
        "phase": "Phase 2",
        "stage": "Implementation",
        "status": "Completed"
      },
      {
        "label": "Mid-campaign check-in",
        "type": "Milestone",
        "date": "2026-08-17",
        "phase": "Phase 3",
        "stage": "Engagement & Measurement",
        "status": "Completed"
      },
      {
        "label": "Results analysis",
        "type": "Task",
        "date": "2026-09-14",
        "phase": "Phase 4",
        "stage": "Assessment",
        "status": "Completed"
      }
    ],
    "meetings": [
      {
        "label": "Board update",
        "date": "2026-08-03"
      },
      {
        "label": "Wrap-up review",
        "date": "2026-09-21"
      }
    ],
    "checklist": [
      {
        "item": "Donor thank-you letters",
        "due": "2026-08-01",
        "done": "2026-08-01",
        "status": "done"
      },
      {
        "item": "Mid-campaign report",
        "due": "2026-08-18",
        "done": "2026-08-19",
        "status": "done"
      },
      {
        "item": "Final results deck",
        "due": "2026-09-22",
        "done": null,
        "status": "upcoming"
      }
    ]
  },
  {
    "id": "p5",
    "type": "Initiative",
    "name": "Nail Networks Expansion",
    "stage": "Closed",
    "depts": [
      "Social Impact",
      "Development"
    ],
    "start": "2026-04-06",
    "end": "2026-08-28",
    "leads": [
      {
        "i": "DK"
      },
      {
        "i": "ID"
      }
    ],
    "meetingCount": 9,
    "activityCount": 47,
    "roadmapRows": [
      {
        "label": "Partner outreach",
        "type": "Task",
        "date": "2026-04-10",
        "phase": "Phase 1",
        "stage": "Discovery",
        "status": "Completed"
      },
      {
        "label": "MOU signed",
        "type": "Milestone",
        "date": "2026-05-04",
        "phase": "Phase 1",
        "stage": "Strategy & Negotiation",
        "status": "Completed"
      },
      {
        "label": "Sprint — onboarding",
        "type": "Sprint",
        "date": "2026-06-01",
        "phase": "Phase 2",
        "stage": "Implementation",
        "status": "Completed"
      },
      {
        "label": "Network live",
        "type": "Milestone",
        "date": "2026-08-24",
        "phase": "Phase 3",
        "stage": "Launch",
        "status": "Completed"
      }
    ],
    "meetings": [
      {
        "label": "Closeout review",
        "date": "2026-08-27"
      }
    ],
    "checklist": [
      {
        "item": "Final compliance sign-off",
        "due": "2026-08-20",
        "done": "2026-08-19",
        "status": "done"
      },
      {
        "item": "Handoff documentation",
        "due": "2026-08-27",
        "done": "2026-08-26",
        "status": "done"
      }
    ]
  },
  {
    "id": "p6",
    "type": "Sprint",
    "name": "Q4 Ops Sprint",
    "stage": "Implementation",
    "depts": [
      "Operations"
    ],
    "start": "2026-09-07",
    "end": "2026-10-19",
    "leads": [
      {
        "i": "JM"
      },
      {
        "i": "SF"
      }
    ],
    "meetingCount": 2,
    "activityCount": 9,
    "roadmapRows": [
      {
        "label": "Backlog grooming",
        "type": "Task",
        "date": "2026-09-08",
        "phase": "Phase 1",
        "stage": "Discovery",
        "status": "Completed"
      },
      {
        "label": "Sprint kickoff",
        "type": "Sprint",
        "date": "2026-09-08",
        "phase": "Phase 1",
        "stage": "Implementation",
        "status": "Completed"
      },
      {
        "label": "Vendor review",
        "type": "Task",
        "date": "2026-09-15",
        "phase": "Phase 1",
        "stage": "Implementation",
        "status": "Completed"
      },
      {
        "label": "Mid-sprint checkpoint",
        "type": "Milestone",
        "date": "2026-09-22",
        "phase": "Phase 2",
        "stage": "Engagement & Measurement",
        "status": "Not Started"
      },
      {
        "label": "Ops runbook update",
        "type": "Task",
        "date": "2026-09-29",
        "phase": "Phase 2",
        "stage": "Implementation",
        "status": "Not Started"
      }
    ],
    "meetings": [
      {
        "label": "Sprint review",
        "date": "2026-10-19"
      }
    ],
    "checklist": [
      {
        "item": "Update on-call rotation",
        "due": "2026-09-19",
        "done": "2026-09-18",
        "status": "done"
      },
      {
        "item": "Vendor contract renewal",
        "due": "2026-09-26",
        "done": null,
        "status": "upcoming"
      },
      {
        "item": "Runbook publish",
        "due": "2026-10-03",
        "done": null,
        "status": "upcoming"
      }
    ]
  },
  {
    "id": "p7",
    "type": "Campaign",
    "name": "Holiday Mixer Planning",
    "stage": "Strategy & Negotiation",
    "depts": [
      "Social Impact",
      "Marketing"
    ],
    "start": "2026-09-21",
    "end": "2026-11-30",
    "leads": [
      {
        "i": "ID"
      }
    ],
    "meetingCount": 1,
    "activityCount": 3,
    "roadmapRows": [],
    "checklist": []
  },
  {
    "id": "p8",
    "type": "Initiative",
    "name": "Nail Networks Partner Outreach",
    "stage": "Engagement & Measurement",
    "depts": [
      "Social Impact"
    ],
    "start": "2026-07-01",
    "end": "2026-10-30",
    "leads": [
      {
        "i": "DK"
      }
    ],
    "meetingCount": 4,
    "activityCount": 18,
    "roadmapRows": [],
    "checklist": []
  },
  {
    "id": "p9",
    "type": "Sprint",
    "name": "Ops Systems Audit",
    "stage": "Paused",
    "depts": [
      "Operations"
    ],
    "start": "2026-08-01",
    "end": "2026-09-30",
    "leads": [
      {
        "i": "JM"
      }
    ],
    "meetingCount": 0,
    "activityCount": 4,
    "roadmapRows": [],
    "checklist": []
  },
  {
    "id": "p10",
    "type": "Project",
    "name": "Fashion & Art Inspiration Dashboard",
    "stage": "Ongoing",
    "depts": [
      "Creative",
      "Product"
    ],
    "start": "2026-06-15",
    "end": "2026-12-31",
    "leads": [
      {
        "i": "AL"
      },
      {
        "i": "SF"
      }
    ],
    "meetingCount": 3,
    "activityCount": 16,
    "roadmapRows": [],
    "checklist": []
  }
];
