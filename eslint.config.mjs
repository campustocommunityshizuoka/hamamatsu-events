import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Next.jsの推奨設定を読み込む（ここでエラーが出ていた部分を修正）
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 無視するファイルの設定（元の設定を維持）
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;