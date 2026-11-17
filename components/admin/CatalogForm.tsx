"use client";
import { useActionState, useId } from "react";
import { deleteCatalog, saveCatalog, type CatalogState } from "@/app/admin/(protected)/danh-muc/actions";
import type { CatalogKind } from "@/lib/admin/catalog-input";

export type CatalogItem = Record<string, string | number | boolean | string[] | null>;
const input = "mt-1 block min-h-11 w-full rounded border px-3 font-normal";

export default function CatalogForm({ kind, item, groups, canDelete }: {
  kind: CatalogKind; item?: CatalogItem; groups?: { id: number; name_vi: string }[]; canDelete?: boolean;
}) {
  const uid = useId();
  const [state, action, pending] = useActionState<CatalogState, FormData>(saveCatalog, {});
  const [dstate, dAction, dPending] = useActionState<CatalogState, FormData>(deleteCatalog, {});
  const e = state.errors ?? {};
  const v = (k: string) => state.values?.[k] ?? (item?.[k] == null ? "" : Array.isArray(item[k]) ? (item[k] as string[]).join(", ") : String(item[k]));
  const eid = (k: string) => `${uid}-${k}`;
  const err = (k: string) => e[k] && <p id={eid(k)} role="alert" className="text-sm text-error">{e[k]}</p>;
  const aria = (k: string) => (e[k] ? { "aria-invalid": true as const, "aria-describedby": eid(k) } : {});
  const field = (k: string, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="block text-sm font-semibold">{label}
        <input name={k} defaultValue={v(k)} className={input} {...aria(k)} {...extra} />
      </label>
      {err(k)}
    </div>
  );
  const isPref = kind === "prefecture";
  return (
    <div className="space-y-2 rounded border p-3">
      <form key={state.nonce ?? 0} action={action} className="space-y-3">
        <input type="hidden" name="kind" value={kind} />
        {item && <input type="hidden" name="id" value={String(item.id)} />}
        {err("form")}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isPref && <p className="text-sm sm:col-span-2 lg:col-span-3"><strong>{String(item?.name_ja)}</strong> ({String(item?.code)})</p>}
          {(kind === "group" || kind === "occupation" || kind === "benefit") && field("slug", "Slug", { required: true, maxLength: 60 })}
          {kind === "skill" ? field("name", "Tên kỹ năng", { required: true, maxLength: 100 }) : field("name_vi", "Tên tiếng Việt", { required: true, maxLength: 100 })}
          {!isPref && kind !== "skill" && field("name_ja", "Tên tiếng Nhật", { required: true, maxLength: 100, lang: "ja" })}
          {kind === "occupation" && (
            <div>
              <label className="block text-sm font-semibold">Nhóm nghề
                <select name="group_id" defaultValue={v("group_id")} className={input} {...aria("group_id")}>
                  <option value="">— Chọn —</option>
                  {groups?.map((g) => <option key={g.id} value={g.id}>{g.name_vi}</option>)}
                </select>
              </label>
              {err("group_id")}
            </div>
          )}
          {(kind === "group" || kind === "benefit") && field("sort", "Thứ tự", { inputMode: "numeric" })}
          {(kind === "occupation" || kind === "skill" || isPref) && field("aliases", "Alias (cách nhau bằng dấu phẩy)")}
          {kind === "benefit" && (
            <label className="flex min-h-11 items-center gap-2 self-end text-sm">
              <input type="checkbox" name="featured" defaultChecked={state.values ? state.values.featured === "on" : item?.featured === true} />Nổi bật
            </label>
          )}
        </div>
        <button type="submit" disabled={pending} className="min-h-11 rounded bg-ink px-4 font-semibold text-paper disabled:opacity-60">{item ? "Lưu" : "Thêm"}</button>
        {state.ok && <span role="status" className="ml-3 text-sm text-success">Đã lưu.</span>}
      </form>
      {canDelete && item && (
        <form action={dAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={String(item.id)} />
          <button type="submit" disabled={dPending} className="min-h-11 rounded border border-error px-4 text-sm font-semibold text-error disabled:opacity-60">Xóa</button>
          {dstate.errors?.form && <p role="alert" className="text-sm text-error">{dstate.errors.form}</p>}
        </form>
      )}
    </div>
  );
}
