"use client";

import { memo } from "react";
import {
  CtvDataTable,
  CTV_TABLE_ROW,
  CTV_TABLE_ROW_LABEL,
  CTV_TABLE_TD,
  CTV_TABLE_TH,
} from "./ctv-data-table";

export type CtvMetricsDetailRow = {
  id: string;
  label: string;
  value: string;
};

type CtvMetricsDetailTableProps = {
  rows: CtvMetricsDetailRow[];
  caption?: string;
  className?: string;
};

function CtvMetricsDetailTableInner({
  rows,
  caption = "Chi tiết số liệu affiliate",
  className = "",
}: CtvMetricsDetailTableProps): JSX.Element {
  return (
    <CtvDataTable
      caption={caption}
      className={className}
      head={
        <tr>
          <th scope="col" className={CTV_TABLE_TH}>
            Chỉ số
          </th>
          <th scope="col" className={`${CTV_TABLE_TH} text-right`}>
            Giá trị
          </th>
        </tr>
      }
    >
      {rows.map((row) => (
        <tr key={row.id} className={CTV_TABLE_ROW}>
          <th scope="row" className={CTV_TABLE_ROW_LABEL}>
            {row.label}
          </th>
          <td className={`${CTV_TABLE_TD} text-right`}>
            <strong className="font-semibold text-[#1A1A1A]">{row.value}</strong>
          </td>
        </tr>
      ))}
    </CtvDataTable>
  );
}

export const CtvMetricsDetailTable = memo(CtvMetricsDetailTableInner);
