import { redirect } from "next/navigation";
import { getT } from "@/i18n/server";
import { can, getMe, getUsers } from "@/lib/server/data";
import { NewUserForm, StatusButton } from "@/features/users/UserForms";

export default async function UsersPage() {
  const { t } = await getT();
  const me = await getMe();
  if (!me.ok) redirect("/login?expired=1");
  if (!can(me.data, "UserAccount.ViewUser")) return <p role="alert" className="alert-error">{t("error.forbidden")}</p>;

  const users = await getUsers();
  const canManage = can(me.data, "UserAccount.CreateNewUser");
  const canGrantAdmin = me.data.isAdministrator || me.data.isCompanyOwner;
  const myStoreIds = me.data.stores.map((s) => s.id);

  return (
    <section className="flex flex-col gap-6">
      <h1 className="page-title">{t("users.title")}</h1>
      {canManage && <NewUserForm canGrantAdmin={canGrantAdmin} storeIds={myStoreIds} />}
      {!users.ok ? (
        <p role="alert" className="alert-error">{users.status === 403 ? t("error.forbidden") : t("common.error")}</p>
      ) : users.data.length === 0 ? (
        <p className="card card-body muted">{t("common.noData")}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("users.userName")}</th>
                <th>{t("users.displayName")}</th>
                <th>{t("users.status")}</th>
                <th>{t("users.lastLogin")}</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.userName}{(u.isAdministrator || u.isCompanyOwner) && <span className="badge-brand ms-2">{t("users.role")}</span>}</td>
                  <td>{u.displayName ?? ""}</td>
                  <td><span className={u.status === "ACTIVE" ? "badge-success" : "badge-danger"}>{u.status === "ACTIVE" ? t("common.active") : t("common.blocked")}</span></td>
                  <td>{u.lastLoginAt === null ? "" : new Date(u.lastLoginAt).toLocaleString()}</td>
                  {canManage && (
                    <td>{u.id !== me.data.userId && <StatusButton id={u.id} blocked={u.status === "BLOCKED"} />}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
