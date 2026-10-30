/* Communications dashboard — example snapshot (buildComms), ported verbatim from
   VCG_Communications_Dashboard.html. Email rows are copied from the Communications table;
   site contact form, chatbot and community rows are EXAMPLES (ex:true). */
import { buildSample } from "./product-data";
import type { Announcement, CommsData, Ticket } from "./product-types";

/** Communications snapshot = the Product snapshot plus Communications rows. */
export function buildComms(): CommsData {
  const b = buildSample();
  const E=(id: string,from: string,subject: string,date: string,status: string,intent: string,needs: number,extra: Partial<Ticket>={}): Ticket=>({id, from, subject, date, status, intent, needs:!!needs, channel:'Email', dir:'Incoming', to:'vcgtracking@gmail.com', body:'', notes:'', draft:'', assignee:'', rt:null, reopened:false, logged:'2026-09-27T12:01:37Z', ...extra});
  const tickets: Ticket[]=[
    E('recOI6aefpA3cQwPk','Nick Aquino <naquino@volsprobono.org>','Re: Follow up from VOLS — operating agreement attached for signature','2026-09-25T18:50:32Z','Open','Inquiry',1,{to:'isisdarks79@gmail.com', thread:'1a09aa097d9fdeec',logged:'2026-09-27T11:49:55Z',
      body:"Hi Isis,\n\nSorry for the delay, but please find attached an operating agreement for your LLC. To make it effective, you just need to sign both lines at the bottom. We do not need to file this with the state, just hold onto it for your records. If you'd prefer, I can set it up for e-signing.\n\nI'm happy to have a call to go over questions you have, otherwise I will consider the legal work on this matter complete.\n\nNick",
      notes:"Pro bono counsel sent the LLC operating agreement to sign. Two open decisions: sign as-is or ask for e-signing, and whether to book the optional call — without a reply he will close the matter. Sent Fri 9/25, unanswered."}),
    E('recEG5WeFD22GSObB','Nick Aquino <naquino@volsprobono.org>','Re: Follow up from VOLS — attachment resend (VCG Operating Agreement.docx)','2026-09-25T18:51:00Z','Open','Inquiry',1,{to:'isisdarks79@gmail.com',logged:'2026-09-27T11:49:55Z',thread:'1a09aa097d9fdeec', attachments:[{name:'VCG Operating Agreement.docx', size:48200, url:null}], attSummary:'LLC operating agreement for Vision Creative Group — two signature lines at the bottom; not filed with the state.', body:"Sorry for the double email, here's the attachment.\n\nNick\n\nAttachment: VCG Operating Agreement.docx",notes:"Follow-up that carries the actual attachment. Same action as the message above — one piece of work, not two."}),
    E('rec1Bg2Zpgvshu6WV','Mail Delivery Subsystem <mailer-daemon@googlemail.com>','Delivery Status Notification (Delay) — isis@vcg.media','2026-09-26T15:20:22Z','Open','Internal',1,{logged:'2026-09-27T11:49:55Z',
      body:"** Delivery incomplete **\n\nThere was a temporary problem delivering your message to isis@vcg.media. Gmail will retry for 46 more hours.",
      notes:"Mail to isis@vcg.media is still failing (day 15). Retry window closes Mon 9/28 ~9:47am ET, after which queued mail is deleted. Fix: restore a mail-enabled Microsoft 365 licence on vcg.media or point the MX at a working mailbox."}),
    E('rec8mtTZ6JMEyHvN7','Mail Delivery Subsystem <mailer-daemon@googlemail.com>','Delivery Status Notification (Failure) — zaid@acrylics.world','2026-09-25T13:47:01Z','Open','Internal',1,{logged:'2026-09-27T11:49:55Z',
      body:"** Address not found **\n\nYour message wasn't delivered to zaid@acrylics.world because the domain acrylics.world couldn't be found.",
      notes:"acrylics.world has no mail (MX) record. Something is still sending to Zaid's old address — find the saved contact or automation and switch it to his working address."}),
    E('recELPogUVvQsThj1','Wells Fargo Appointments <appointments@wellsfargo.com>','Your appointment is scheduled — Wells Fargo, Mon Sep 28 9:00am EDT','2026-09-24T18:03:20Z','Open','Booking',1,{logged:'2026-09-27T11:49:55Z',
      attachments:[{name:'Appointment.ics', size:2100, url:null}], body:"We'll see you on Sep. 28\n\nWhy: Business — Open a new business account\nWhat to bring: two forms of ID and the documents for your business entity.\nWhen: Monday, September 28, 2026 at 09:00 AM EDT, for 60 minutes.",
      notes:"Business-account appointment Mon 9/28 9am. Bring two IDs and entity documents (the account can't be opened remotely)."}),
    E('recwDZaydaKlT0MaS','OpenAI <noreply@email.openai.com>','Get help with a form','2026-09-26T22:23:24Z','Closed','Spam/Irrelevant',0),
    E('recW8fQ2GrTsZWi30','ClickUp Help <help@clickup.com>','All Set! Your Docs Have Landed in ClickUp (duplicate notification)','2026-09-26T17:07:44Z','Closed','Internal',0),
    E('recaeMDbDyXmPOLjV','ClickUp Help <help@clickup.com>','All Set! Your Docs Have Landed in ClickUp','2026-09-26T17:03:51Z','Closed','Internal',0),
    E('recjdFZ7Tl4l3FWxL','Mail Delivery Subsystem <mailer-daemon@googlemail.com>','Delivery Status Notification (Delay) — isis@vcg.media','2026-09-26T14:45:06Z','Closed','Internal',0,{logged:'2026-09-27T11:49:55Z'}),
    E('recJazngSy8ywYGn2','Mail Delivery Subsystem <mailer-daemon@googlemail.com>','Delivery Status Notification (Delay) — isis@vcg.media','2026-09-26T14:09:05Z','Closed','Internal',0,{logged:'2026-09-27T11:49:55Z'}),
    E('recWAFvCUQW1TqXeZ','Semrush <noreply@semrush.com>',"Your Semrush MCP access is now active",'2026-09-26T10:34:06Z','Closed','Internal',0),
    E('recpnWpflegC1jfvI','Rhonesha Byng <Rhonesha@heragenda.com>','Right here. Right now. Are you ready to level up?','2026-09-25T23:54:24Z','Closed','Spam/Irrelevant',0),
    E('recwHgd6ebW1H2m9L','Exa <hello@exa.ai>','Next Generation Deep Research (Exa)','2026-09-25T21:11:06Z','Closed','Spam/Irrelevant',0),
    E('recyR6XhOSj5AQbq7','Eventbrite <noreply@event.eventbrite.com>','The CMO Scoop (episode 17) is now LIVE on YouTube','2026-09-25T20:00:49Z','Closed','Spam/Irrelevant',0),
    E('rec1ubnbH6zHTgiBb','Creative Market <hello@creativemarket.com>',"Starting at $12: 6 fonts we're loving this week",'2026-09-25T16:51:35Z','Closed','Spam/Irrelevant',0),
    E('recViLBf0ijVMmsAR','ClickUp <team@mail.clickup.com>','Brain² Bytes: Art Kits + Workload Intelligence are live','2026-09-25T15:13:04Z','Closed','Spam/Irrelevant',0),
    E('receUaQaI6EIVZBPC','Mail Delivery Subsystem <mailer-daemon@googlemail.com>','Delivery Status Notification (Failure) — zaid@acrylics.world','2026-09-25T12:52:38Z','Closed','Internal',0,{logged:'2026-09-27T11:49:55Z'}),
    E('recxhqAYEZT3shQgx','Mail Delivery Subsystem <mailer-daemon@googlemail.com>','Delivery Status Notification (Failure) — zaid@acrylics.world','2026-09-25T12:52:22Z','Closed','Internal',0,{logged:'2026-09-27T11:49:55Z'}),
    E('recv5Rj4Lmgxdv9DN','Semrush News <news@team.semrush.com>','Your content trains AI (Semrush newsletter)','2026-09-25T10:40:17Z','Closed','Spam/Irrelevant',0),
    E('recTWxgyOvFuLVEhS','ClickUp Help <help@clickup.com>','All Set! Your Docs Have Landed in ClickUp (9/24)','2026-09-24T20:48:30Z','Closed','Internal',0),
    E('rec4dhcGeycBAbomM','GreenBook Marketing <marketing@greenbook.org>','What did you think of IIEX.AI 2026?','2026-09-24T20:12:52Z','Closed','Spam/Irrelevant',0),
    E('recUA5ma5qpIp5pAP','IIEX Events <iiexevents@greenbook.org>','Starting now: The final sessions of Day 2 (IIEX.AI)','2026-09-24T18:26:02Z','Closed','Spam/Irrelevant',0),
    E('recdQdpApTFEcI6rH','Wells Fargo Appointments <appointments@wellsfargo.com>','Appointment has been canceled — Wells Fargo, Fri Sep 25 9:00am EDT','2026-09-24T18:03:19Z','Closed','Booking',0,{logged:'2026-09-27T11:49:55Z'}),
    E('recZBz4mPiIY2hEv9','Adobe <mail@mail.adobe.com>','Share your thoughts: chance to win $500 (Adobe survey)','2026-09-24T17:01:08Z','Closed','Spam/Irrelevant',0),
    E('recriItJ2w9HbVdUx','Zapier Learn <learn@send.zapier.com>','Today, AI stopped chatting and started working (ZapConnect 2026 recap)','2026-09-24T16:48:46Z','Closed','Spam/Irrelevant',0),
    E('recQ6lekx8I3icyRZ','IIEX Events <iiexevents@greenbook.org>',"Isis, don't miss what's next at IIEX.AI",'2026-09-24T15:50:25Z','Closed','Spam/Irrelevant',0),
    E('reclj2OyR8HIFUpj5','GreenBook Webinars <webinars@greenbook.org>','LIVE Oct 22: Quantilope talks top trends for 2027','2026-09-24T14:13:26Z','Closed','Spam/Irrelevant',0),
    E('recGjIFmtG6OcAipK','IIEX Events <iiexevents@greenbook.org>','DAY 2 STARTS NOW: Tune in to IIEX.AI','2026-09-24T13:21:20Z','Closed','Spam/Irrelevant',0),
    E('recqdQc9XTRrAZBT3','Wells Fargo Appointments <appointments@wellsfargo.com>',"Your appointment's coming up — Wells Fargo (Sep 25 booking, since cancelled)",'2026-09-24T13:01:29Z','Closed','Booking',0,{logged:'2026-09-27T11:49:55Z'}),
    E('recyoFLXR0jbHaQgU','GreenBook Marketing <marketing@greenbook.org>','What Will the Research Team of Tomorrow Look Like?','2026-09-24T09:50:09Z','Closed','Spam/Irrelevant',0),
    /* EXAMPLES — acrylics.world contact form, chatbot and community (not flowing yet) */
    {id:'ex1', ex:true, attachments:[{name:'booking-pending.png', size:184000, url:null}], channel:'Web Form', dir:'Incoming', from:'Tasha M. <tasha.m@example.com>', to:'acrylics.world contact form', subject:'My deposit went through but the booking says pending', date:'2026-09-28T14:12:00Z', status:'Open', intent:'Complaint', needs:true, assignee:'', rt:null, reopened:false, logged:'2026-09-28T15:00:00Z',
      body:"Hi, I paid the $25 deposit for a gel-x set with Nail Haus on Saturday and the booking still says pending. Did the artist get it? I don't want to lose my slot.", notes:'Customer paid a deposit; booking shows pending. Likely waiting on the artist to accept (launch test C5). Reassure, check the booking in Stripe, nudge the artist.', draft:''},
    {id:'ex2', ex:true, channel:'Web Form', dir:'Incoming', from:'Dana Price <dana@gloss-studios.example>', to:'acrylics.world contact form', subject:'Partnership — 6-location salon group in Atlanta', date:'2026-09-28T11:40:00Z', status:'Open', intent:'Partnership', needs:true, assignee:'Isis Darks', rt:null, reopened:false, logged:'2026-09-28T12:00:00Z',
      body:"We run six salons around Atlanta and want to list all of our artists on ACRYLICS before the holidays. Who can we talk to about a group plan?", notes:'Multi-location salon group asking about a group plan — Moguls tier lead. Route to Partnerships.', draft:''},
    {id:'ex3', ex:true, channel:'Chat', dir:'Incoming', from:'Guest · chatbot', to:'acrylics.world chatbot', subject:'How do I change my payout account?', date:'2026-09-28T16:05:00Z', status:'Replied', intent:'Inquiry', needs:false, assignee:'', rt:.1, reopened:false, logged:'2026-09-28T16:30:00Z',
      body:'how do i change the bank account my payouts go to', notes:'Answered by the chatbot from the Help Centre article "Payouts".', draft:"Go to Payouts → Payout account → Change. You'll be sent to Stripe to confirm the new account — payouts switch over within 1 business day."},
    {id:'ex4', ex:true, channel:'Chat', dir:'Incoming', from:'Mia (Creators trial) · chatbot', to:'acrylics.world chatbot', subject:'Can I cancel my trial before I get charged?', date:'2026-09-28T17:20:00Z', status:'Open', intent:'Inquiry', needs:true, assignee:'', rt:null, reopened:false, logged:'2026-09-28T17:30:00Z',
      body:"I started the Creators trial but I'm not sure I'll keep it. If I cancel now do I still get the 14 days?", notes:'Chatbot was not sure about the trial rule and handed this to a person.', draft:"Yes — if you cancel during your 14-day trial you keep access until the trial ends and you won't be charged. You can cancel anytime from Billing → Manage plan."},
    {id:'ex5', ex:true, channel:'Community', dir:'Incoming', from:'u/lacquerqueen · Community help', to:'acrylics.world community', subject:'Booking calendar shows the wrong time zone', date:'2026-09-28T13:02:00Z', status:'Open', intent:'Complaint', needs:true, assignee:'', rt:null, reopened:false, logged:'2026-09-28T13:30:00Z', votes:14,
      body:'Anyone else seeing bookings an hour off? My client in Denver booked 3pm and it shows 4pm for me. 14 people upvoted this.', notes:'Several members report the same time-zone shift. Likely a product bug — also log in IT & Systems Registry.', draft:''}
  ];
  /* sample response times for answered rows */
  tickets.forEach(t=>{ if(t.status==='Replied'&&t.rt==null) t.rt=3; });
  const depts=['Executive','Success','Operations','Product','Marketing & Sales','Creative','Media (Communications)','Social Impact','Production/Fabrication','Legal & Compliance','Finance'].map((n,i)=>({id:'d'+i,name:n}));
  const ANN: Announcement[]=[
    {id:'a1', title:'ACRYLICS launch test script is live', body:'33 launch tests are in P.I.C.S Checklist. Pick yours from Product → Launch and tick it off when it passes.', page:'Product', dept:'Product', type:'Release', to:['Slack #acrylics','Email · department only'], status:'Published', date:'2026-09-21T14:00:00Z', expires:'2026-10-16', pinned:true, by:'Isis Darks', files:['ACRYLICS launch test script.pdf']},
    {id:'a2', title:'vcg.media email is down — use vcgtracking@gmail.com', body:'Until the Microsoft 365 licence is restored, send anything for Isis to vcgtracking@gmail.com.', page:'Home', dept:'Operations', type:'Alert', to:['Slack #general'], status:'Draft', date:'2026-09-28T15:00:00Z', expires:'', pinned:true, by:'SUCANT'},
    {id:'a3', title:'GTM creative sprint starts Oct 26', body:'Creative & Content sprint for the ACRYLICS GTM Campaign runs Oct 26 – Nov 6. Brief lands in Briefs by Oct 19.', page:'Marketing & Sales', dept:'Marketing & Sales', type:'Announcement', to:['Slack #general'], status:'Published', date:'2026-10-19T13:00:00Z', expires:'2026-11-06', pinned:false, by:'Isis Darks'},
    {id:'a4', title:'Holiday Mixer — save the date', body:'Nail Networks Holiday Mixer planning has started. Details to follow on the Social Impact page.', page:'Social Impact', dept:'Social Impact', type:'Event', to:[], status:'Published', date:'2026-09-15T15:00:00Z', expires:'2026-09-27', pinned:false, by:'Isis Darks'}
  ];
  return {...b, mode:'sample', tickets, announcements:ANN, depts, me:'Isis Darks', meRole:'Admin — can post to every page', team:b.team};
}

