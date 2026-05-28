import { Crown, Users } from "lucide-react";
import CopyButton from "./CopyButton";
import { formatMemberCount, formatRelativeDate, type GroupWithMeta } from "@/lib/groups";

export default function GroupCard({ group }: { group: GroupWithMeta }) {
  return (
    <div className="bg-[#18182a] border border-[#2a2a45] rounded-2xl p-4 hover:border-[#2a2a45]/80 transition-colors">

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base leading-none">⚽</span>
            <h3 className="text-sm font-bold text-[#f1f5f9] truncate">
              {group.name}
            </h3>
          </div>
          <p className="text-xs text-[#475569]">
            Creado {formatRelativeDate(group.created_at)}
          </p>
        </div>

        {group.is_owner && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] font-semibold shrink-0">
            <Crown size={10} />
            Admin
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
          <Users size={13} strokeWidth={1.8} />
          <span>{formatMemberCount(group.member_count)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#475569]">Código:</span>
          <CopyButton text={group.invite_code} />
        </div>
      </div>
    </div>
  );
}
