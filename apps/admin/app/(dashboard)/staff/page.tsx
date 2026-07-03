import { apiFetch, ApiError } from "../../../lib/api";
import type { StaffUser } from "../../../lib/types";
import { createStaffUserAction } from "./actions";

export default async function StaffUsersPage() {
  let staffUsers: StaffUser[];
  try {
    staffUsers = await apiFetch<StaffUser[]>("/staff-users");
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      return (
        <div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Staff Users</h1>
          <p className="text-slate-600">Admin role required to manage staff users.</p>
        </div>
      );
    }
    throw err;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Staff Users</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffUsers.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-slate-500">{s.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Add a staff user</h2>
        <form action={createStaffUserAction} className="space-y-3">
          <input name="name" placeholder="Name" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="phone" placeholder="Phone (+1...)" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="password" type="password" placeholder="Password" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="role" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Add staff user
          </button>
        </form>
      </div>
    </div>
  );
}
