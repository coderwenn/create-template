import minimist from "minimist";
import chalk from "chalk";
import prompts from "prompts";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

type Framework = {
  name: string;
  display: string;
  color: Function;
  variants: FrameworkVariant[];
};

type FrameworkVariant = {
  name: string;
  display: string;
  color: Function;
  customCommand?: string;
};

const FRAMEWORKS: Framework[] = [
  {
    name: "vue",
    color: chalk.green,
    display: "Vue",
    variants: [
      {
        name: "vue-ts",
        display: "Vue3 + TypeScript",
        color: chalk.green,
      },
      {
        name: "vue",
        display: "Vue3 + JavaScript",
        color: chalk.green,
      },
    ],
  },
  {
    name: "react",
    color: chalk.cyan,
    display: "React",
    variants: [
      {
        name: "react-ts",
        display: "React + TypeScript",
        color: chalk.cyan,
      },
      {
        name: "react",
        display: "React + JavaScript",
        color: chalk.cyan,
      },
    ],
  },
];

const argv = minimist<{
  help?: string;
  template?: string;
}>(process.argv.slice(2), {
  // 设置别名
  alias: {
    t: "template",
    h: "help",
  },
  // 转为 string
  string: ["_"],
});

// 控制台信息
// console.log(argv, 'argv')

// 设置 help 提示
const helpMes = `\
用法: create-template [options]
用JavaScript或TypeScript创建一个新的Vite项目。
不带参数, 以交互模式启动CLI。
Options:
  -t, --template <template>  模板名称
  -h, --help                显示帮助信息
已经支持的模版：
${chalk.green("vue-ts")} - Vue3 + TypeScript
${chalk.green("vue")} - Vue3 + JypeScript
${chalk.cyan("react-ts")} - React + TypeScript
${chalk.cyan("react")} - React + JypeScript
`;

// 文件名
function formatTargetDir(targenDir: string | undefined) {
  return targenDir?.trim().replace(/\/$/g, "");
}

// 默认的文件名
const defaultTargetDir = "project-name";

// 模版数组
const templates = FRAMEWORKS.flatMap((framework) =>
  framework.variants.map((e) => e.name)
);

const renameFiles: Record<string, any> = {
  _gitignore: ".gitignore",
};

const write = (
  templateDir: string,
  root: string,
  file: string,
  content?: string
) => {
  const targetPath = path.join(root, renameFiles[file] ?? file);
  if (content) {
    fs.writeFileSync(targetPath, content);
  } else {
    copy(path.join(templateDir, file), targetPath);
  }
};

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    copy(srcFile, destFile);
  }
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function init() {
  if (argv.help) {
    console.log(helpMes);
    return;
  }
  // 模版创建
  const argTemplate = argv.template || argv.t;
  let projectName = formatTargetDir(argv._[0]);
  console.log(argv, "projectName");

  // 创建提示
  let result: prompts.Answers<"projectName" | "framework" | "variant">;

  try {
    result = await prompts(
      [
        {
          type: argTemplate && projectName ? null : "text",
          name: "projectName",
          message: chalk.reset("项目名:"),
          initial: defaultTargetDir,
          onState: (state) => {
            projectName = formatTargetDir(state.value) || defaultTargetDir;
          },
        },
        {
          type:
            argTemplate && projectName && templates.includes(projectName)
              ? null
              : "select",
          name: "framework",
          message: chalk.reset("选择框架:"),
          initial: 0,
          choices: FRAMEWORKS.map((framework) => {
            const frameworkColor = framework.color;
            return {
              title: frameworkColor(framework.display || framework.name),
              value: framework,
            };
          }),
        },
        {
          type: (framework: Framework) =>
            framework.variants ? "select" : null,
          name: "variant",
          message: chalk.reset("选择模板:"),
          choices: (framework: Framework) => {
            return framework.variants.map((variant) => {
              const variantColor = variant.color;
              return {
                title: variantColor(variant.display || variant.name),
                value: variant,
              };
            });
          },
        },
      ],
      {
        onCancel() {
          throw new Error("取消创建");
        },
      }
    );
    const { framework, variant } = result;

    const root = path.join(process.cwd(), projectName!);

    let template: string = variant.name || argTemplate;

    console.log(`\nScaffolding project in ${root}...`);

    const templateDir = path.resolve(
      fileURLToPath(import.meta.url),
      "../templates",
      `template-${template}`
    );
    console.log("templateDir", templateDir, fileURLToPath(import.meta.url));
    if (!fs.existsSync(root)) {
      // 创建文件夹
      fs.mkdirSync(root, { recursive: true });
    }

    const files = fs.readdirSync(templateDir);

    for (const file of files) {
      write(templateDir, root, file);
    }

    const cdProjectName = path.relative(process.cwd(), root);
    console.log(`\nDone. Now run:\n`);

    if (root !== process.cwd()) {
      console.log(`cd ${cdProjectName}`);
    }
  } catch (e) {
    console.error("创建失败", e);
  }
}

init().catch((e) => {
  console.error("创建模板失败", e);
});
