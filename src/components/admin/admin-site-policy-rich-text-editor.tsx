"use client";

import { Color } from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

import { adminInput } from "../../lib/admin-ui";

const COLORS = ["#111827", "#DC2626", "#2563EB", "#059669", "#D97706", "#7C3AED"];

function Toolbar({ editor }: { editor: Editor | null }): JSX.Element | null {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 px-2 py-2">
      <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Soạn</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`rounded-md px-2 py-1 text-xs font-semibold ${editor.isActive("bold") ? "bg-slate-200" : "hover:bg-slate-200"}`}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`rounded-md px-2 py-1 text-xs italic ${editor.isActive("italic") ? "bg-slate-200" : "hover:bg-slate-200"}`}
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`rounded-md px-2 py-1 text-xs underline ${editor.isActive("underline") ? "bg-slate-200" : "hover:bg-slate-200"}`}
      >
        U
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`rounded-md px-2 py-1 text-xs line-through ${editor.isActive("strike") ? "bg-slate-200" : "hover:bg-slate-200"}`}
      >
        S
      </button>
      <span className="text-slate-300">|</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`rounded-md px-2 py-1 text-xs font-bold ${editor.isActive("heading", { level: 2 }) ? "bg-slate-200" : "hover:bg-slate-200"}`}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`rounded-md px-2 py-1 text-xs font-bold ${editor.isActive("heading", { level: 3 }) ? "bg-slate-200" : "hover:bg-slate-200"}`}
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`rounded-md px-2 py-1 text-xs ${editor.isActive("bulletList") ? "bg-slate-200" : "hover:bg-slate-200"}`}
      >
        •
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`rounded-md px-2 py-1 text-xs ${editor.isActive("orderedList") ? "bg-slate-200" : "hover:bg-slate-200"}`}
      >
        1.
      </button>
      <span className="text-slate-300">|</span>
      <button
        type="button"
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("URL liên kết", prev ?? "https://");
          if (url === null) return;
          const t = url.trim();
          if (!t) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: t }).run();
        }}
        className={`rounded-md px-2 py-1 text-xs ${editor.isActive("link") ? "bg-slate-200" : "hover:bg-slate-200"}`}
      >
        Link
      </button>
      <button
        type="button"
        onClick={() => {
          const url = window.prompt("URL ảnh (https://…)", "https://");
          if (!url?.trim()) return;
          editor.chain().focus().setImage({ src: url.trim(), alt: "" }).run();
        }}
        className="rounded-md px-2 py-1 text-xs hover:bg-slate-200"
      >
        Ảnh
      </button>
      <button
        type="button"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        className="rounded-md px-2 py-1 text-xs hover:bg-slate-200"
      >
        Bảng
      </button>
      <span className="text-slate-300">|</span>
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Màu ${c}`}
          onClick={() => editor.chain().focus().setColor(c).run()}
          className="h-6 w-6 rounded-full border border-slate-200 shadow-sm hover:brightness-110"
          style={{ backgroundColor: c }}
        />
      ))}
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetColor().run()}
        className="ml-1 rounded-md px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200"
      >
        Xóa màu
      </button>
    </div>
  );
}

export default function AdminSitePolicyRichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Soạn chính sách: đoạn văn, tiêu đề, ảnh, bảng…" }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value && value.trim().length ? value : "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[280px] px-3 py-3 outline-none prose-headings:font-semibold prose-a:text-blue-700",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || value === editor.getHTML()) return;
    editor.commands.setContent(value && value.trim().length ? value : "<p></p>", false);
  }, [value, editor]);

  return (
    <div className="space-y-0">
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className={`${adminInput} rounded-t-none border-t-0 bg-white [&_.ProseMirror]:min-h-[280px]`}
      />
    </div>
  );
}
