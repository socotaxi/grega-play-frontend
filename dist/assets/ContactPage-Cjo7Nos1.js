import{j as e}from"./vendor-motion-DFExM1rR.js";import{r as p}from"./vendor-react-C1-8KcLs.js";import{M as x}from"./MainLayout-CtSc0oZw.js";import{B as f}from"./Button-BryoIRMk.js";import{y as c}from"./index-B_GyioqJ.js";import"./vendor-supabase-HlLYS0Ap.js";const b="http://127.0.0.1:3001",y="grega-play-backend-290199";async function h(t,r){const a=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":y},body:JSON.stringify(r)}),s=await a.text().catch(()=>"");if(!a.ok)throw console.error("❌ Erreur HTTP email:",a.status,s),new Error("Erreur API email");try{return JSON.parse(s)}catch{return{}}}const g={generateContactEmailTemplate({name:t,fromEmail:r,message:a,submittedAt:s}){const l=t||"Invité Grega Play",o=r||"non communiqué",m=a&&a.trim()||"Aucun message détaillé n'a été fourni.",n=s||new Date().toLocaleString("fr-FR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});return`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Nouveau message de contact - Grega Play</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #0f172a;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      padding: 24px 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 35px rgba(15,23,42,0.18);">
      <div style="background:#0f172a;padding:22px 20px;text-align:center;">
        <img src="https://cgqnrqbyvetcgwolkjvl.supabase.co/storage/v1/object/public/gregaplay-assets/logo.png" alt="Grega Play" style="width:160px;height:auto;display:block;margin:0 auto 6px auto;" />
        <p style="color:#e2e8f0;font-size:13px;margin:2px 0 0 0;opacity:0.9;">Together, we create the moment</p>
      </div>

      <div style="padding:22px 22px 20px 22px;background:#ffffff;">
        <h1 style="margin:0 0 10px 0;font-size:20px;color:#0f172a;">Nouveau message depuis le formulaire de contact</h1>
        <p style="margin:0 0 14px 0;font-size:14px;color:#4b5563;">
          Tu as reçu un nouveau message envoyé depuis la page <strong>Contact</strong> de Grega Play.
        </p>

        <div style="background:#f9fafb;border-radius:12px;padding:14px 16px;margin:6px 0 16px 0;border-left:4px solid #16a34a;">
          <p style="margin:0 0 6px 0;font-size:13px;color:#111827;"><strong>Infos expéditeur :</strong></p>
          <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">
            <strong>Nom :</strong> ${l}<br/>
            <strong>Email :</strong> ${o}<br/>
            <strong>Reçu le :</strong> ${n}
          </p>
        </div>

        <div style="background:#eff6ff;border-radius:12px;padding:14px 16px;margin-bottom:18px;">
          <p style="margin:0 0 6px 0;font-size:13px;color:#1e293b;"><strong>Message :</strong></p>
          <p style="margin:0;font-size:13px;color:#111827;line-height:1.7;white-space:pre-wrap;">
            ${m.replace(/</g,"&lt;").replace(/>/g,"&gt;")}
          </p>
        </div>

        <p style="margin:0;font-size:12px;color:#6b7280;">
          Tu peux répondre directement à ${o} depuis ta boîte mail.
        </p>
      </div>

      <div style="background:#f8fafc;padding:14px 12px 18px 12px;text-align:center;font-size:11px;color:#94a3b8;">
        Grega Play – L'émotion se construit ensemble<br />
        <span style="display:inline-block;margin-top:3px;">Ce message te parvient suite à une demande via le site gregaplay.com</span>
      </div>
    </div>
  </div>
</body>
</html>
    `},async sendContactMessage(t){return h(`${b}/api/email/contact`,t)}},C=()=>{const[t,r]=p.useState({name:"",email:"",message:"",website:""}),[a,s]=p.useState(!1),[l]=p.useState(()=>Date.now()),o=n=>{const{name:d,value:i}=n.target;r(u=>({...u,[d]:i}))},m=async n=>{if(n.preventDefault(),s(!0),t.website&&t.website.trim().length>0){c.success("Votre message a été envoyé avec succès."),r({name:"",email:"",message:"",website:""}),s(!1);return}if(Date.now()-l<3e3){c.error("Envoi trop rapide détecté. Merci de réessayer."),s(!1);return}try{const i=g.generateContactEmailTemplate({name:t.name,fromEmail:t.email,message:t.message,submittedAt:new Date().toISOString()});await g.sendContactMessage({email:"edhemrombhot@gmail.com",subject:`📩 Message depuis Grega Play - ${t.name}`,content:i,website:t.website,formCreatedAt:l}),c.success("Votre message a été envoyé avec succès."),r({name:"",email:"",message:"",website:""})}catch(i){console.error("Erreur function:",i),c.error("Erreur lors de l'envoi de l'email.")}finally{s(!1)}};return e.jsx(x,{children:e.jsx("div",{className:"min-h-[calc(100vh-80px)] bg-gray-50",children:e.jsxs("div",{className:"max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-start md:justify-between gap-10",children:[e.jsxs("div",{className:"md:w-1/2",children:[e.jsx("h1",{className:"text-3xl font-bold text-gray-900 mb-3",children:"Contacte l’équipe Grega Play"}),e.jsx("p",{className:"text-base text-gray-600 mb-4",children:"Une question sur l’application, un problème technique ou une idée de fonctionnalité ? Écris-nous et nous te répondons dès que possible."}),e.jsxs("div",{className:"mt-6 text-sm text-gray-600 space-y-1",children:[e.jsx("p",{className:"font-semibold text-gray-800",children:"Email direct"}),e.jsx("p",{children:"contact@grega-play.com"}),e.jsx("p",{className:"text-xs text-gray-500",children:"Tu peux aussi nous écrire directement depuis ce formulaire."})]})]}),e.jsx("div",{className:"md:w-1/2",children:e.jsxs("div",{className:"bg-white p-6 rounded-2xl shadow-sm border border-gray-200",children:[e.jsx("h2",{className:"text-xl font-semibold text-gray-900 mb-1",children:"Envoyer un message"}),e.jsx("p",{className:"text-xs text-gray-500 mb-4",children:"Merci de détailler ta demande pour que nous puissions te répondre plus efficacement."}),e.jsxs("form",{onSubmit:m,className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("label",{htmlFor:"name",className:"block text-xs font-semibold text-gray-700 uppercase tracking-wide",children:"Nom"}),e.jsx("input",{type:"text",name:"name",id:"name",value:t.name,onChange:o,required:!0,className:"mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",placeholder:"Ton nom ou prénom"})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"email",className:"block text-xs font-semibold text-gray-700 uppercase tracking-wide",children:"Email"}),e.jsx("input",{type:"email",name:"email",id:"email",value:t.email,onChange:o,required:!0,className:"mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",placeholder:"ton.email@example.com"})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"message",className:"block text-xs font-semibold text-gray-700 uppercase tracking-wide",children:"Message"}),e.jsx("textarea",{name:"message",id:"message",rows:4,value:t.message,onChange:o,required:!0,className:"mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none",placeholder:"Explique-nous en quelques lignes ce que tu souhaites."})]}),e.jsxs("div",{className:"hidden",children:[e.jsx("label",{htmlFor:"website",children:"Laissez ce champ vide"}),e.jsx("input",{type:"text",name:"website",id:"website",value:t.website,onChange:o,autoComplete:"off"})]}),e.jsx("div",{className:"pt-2",children:e.jsx(f,{type:"submit",disabled:a,loading:a,className:"w-full py-2.5 text-sm font-semibold",children:"Envoyer le message"})})]})]})})]})})})};export{C as default};
