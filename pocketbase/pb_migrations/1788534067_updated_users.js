/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "otp": {
      "emailTemplate": {
        "body": "<table\n  role=\"presentation\"\n  width=\"100%\"\n  cellpadding=\"0\"\n  cellspacing=\"0\"\n  border=\"0\"\n  style=\"width:100%; margin:0; padding:0; background-color:#f4f7f5;\"\n>\n  <tr>\n    <td align=\"center\" style=\"padding:24px 12px;\">\n      <table\n        role=\"presentation\"\n        width=\"100%\"\n        cellpadding=\"0\"\n        cellspacing=\"0\"\n        border=\"0\"\n        style=\"width:100%; max-width:680px; border-collapse:separate; border-spacing:0;\n               background-color:#ffffff; border:1px solid #e2e8e4;\n               border-radius:12px; overflow:hidden;\"\n      >\n        <tr>\n          <td\n            style=\"padding:28px 24px; background-color:#0f2d1a;\n                   background-image:linear-gradient(145deg,#0a1f10 0%,#14532d 100%);\n                   font-family:'Outfit','Segoe UI',Arial,sans-serif;\"\n          >\n            <div style=\"font-size:24px; line-height:30px; font-weight:700; color:#ffffff;\">\n              bvHub\n            </div>\n            <div style=\"margin-top:4px; font-size:13px; line-height:20px; color:#b9d9c3;\">\n              Badminton Verein Erlangen n.e.V. · Member Portal\n            </div>\n          </td>\n        </tr>\n\n        <tr>\n          <td\n            style=\"padding:32px 24px 16px;\n                   font-family:'Outfit','Segoe UI',Arial,sans-serif;\n                   color:#1a211d;\"\n          >\n            <h1 style=\"margin:0; font-size:24px; line-height:32px; font-weight:700;\">\n              Dein Anmeldecode\n            </h1>\n\n            <p style=\"margin:14px 0 0; font-size:15px; line-height:24px; color:#5f6963;\">\n              Verwende den folgenden einmaligen Code, um dich sicher bei\n              <strong style=\"color:#1a211d;\">{APP_NAME}</strong> anzumelden:\n            </p>\n          </td>\n        </tr>\n\n        <tr>\n          <td style=\"padding:12px 24px 20px;\">\n            <div\n              style=\"padding:22px 12px; text-align:center;\n                     background-color:#eefbf3; border:1px solid #bbf7d0;\n                     border-radius:10px;\"\n            >\n              <div\n                style=\"font-family:'Courier New',Courier,monospace;\n                       font-size:30px; line-height:38px; font-weight:700;\n                       letter-spacing:8px; color:#15803d;\"\n              >\n                {OTP}\n              </div>\n            </div>\n          </td>\n        </tr>\n\n        <tr>\n          <td\n            style=\"padding:0 24px 32px;\n                   font-family:'Outfit','Segoe UI',Arial,sans-serif;\"\n          >\n            <p style=\"margin:0; font-size:14px; line-height:22px; color:#5f6963;\">\n              Der Code ist nur kurze Zeit und ausschließlich für einen\n              Anmeldevorgang gültig.\n            </p>\n\n            <p\n              style=\"margin:18px 0 0; padding:12px 14px;\n                     font-size:13px; line-height:20px; color:#6b5b16;\n                     background-color:#fff8e1; border-left:4px solid #f59e0b;\"\n            >\n              Teile diesen Code niemals mit anderen Personen. Das bvHub-Team\n              wird dich nie nach deinem Anmeldecode fragen.\n            </p>\n\n            <p style=\"margin:20px 0 0; font-size:13px; line-height:21px; color:#7a847e;\">\n              Falls du keinen Anmeldecode angefordert hast, kannst du diese\n              Nachricht ignorieren.\n            </p>\n          </td>\n        </tr>\n\n        <tr>\n          <td\n            style=\"padding:18px 24px; border-top:1px solid #e7ebe8;\n                   background-color:#fafbfa;\n                   font-family:'Outfit','Segoe UI',Arial,sans-serif;\n                   text-align:center;\"\n          >\n            <p style=\"margin:0; font-size:12px; line-height:19px; color:#89918c;\">\n              Badminton Verein Erlangen n.e.V. · Est. 2025\n            </p>\n            <p style=\"margin:4px 0 0; font-size:11px; line-height:18px; color:#a0a7a3;\">\n              Automatisch versendete Sicherheitsnachricht\n            </p>\n          </td>\n        </tr>\n      </table>\n    </td>\n  </tr>\n</table>",
        "subject": "Dein bvHub-Anmeldecode"
      }
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "otp": {
      "emailTemplate": {
        "body": "Dein bvHub-Code lautet: {OTP}",
        "subject": "bvHub Anmeldecode"
      }
    }
  }, collection)

  return app.save(collection)
})
