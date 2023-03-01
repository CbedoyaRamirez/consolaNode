
import { intro, outro, text, select, confirm, multiselect , isCancel} from '@clack/prompts'
import { COMMIT_TYPES } from './commits-types.js'
import colors from 'picocolors'
import { getChangedFiles, getStagedFiles, gitCommit, gitAdd } from './git.js'
import { trytm } from '@bdsqqq/try'

intro(colors.inverse('Asistente para realizar commits'))

const [changedFiles, errorChangedFiles] = await trytm(getChangedFiles())
const [stagedFiles, errorStagedFiles] = await trytm(getStagedFiles())

if (errorChangedFiles ?? errorStagedFiles) {
  outro(colors.red('Asegurate que estes en un repositorio de git valido'))
  process.exit(1)
}

if (stagedFiles.length === 0 && changedFiles.length > 0) {
  const files = await multiselect({
    message: colors.cyan('Selecciona los archivos que quieres añadir'),
    options: changedFiles.map(file => ({
      value: file,
      label: file
    }))
  })
  if (isCancel(files)) {
    outro(colors.yellow('No se han encontrado archivos para añadir'))
    process.exit(0)
  }
  await gitAdd(files)
}

const selectCommit = await select({
  message: colors.cyan('Seleccione el tipo de commit que desea agregar'),
  options: Object.entries(COMMIT_TYPES).map(([key, value]) => ({
    value: key,
    label: `${value.emoji} ${key.padEnd(8, ' ')} · ${value.description}`
  }))
})

const commitMessage = await text({
  message: colors.cyan('Introduce el mensaje del commit')
})

const { emoji, release } = COMMIT_TYPES[selectCommit]

let breakingChange = false

if (release) {
  breakingChange = await confirm({
    initialValue: false,
    message: colors.cyan('tiene este commit cambios que rompan la compatibilidad anterior?')
  })
}

let commit = `${emoji} ${selectCommit}: ${commitMessage}`
commit = breakingChange ? `${commit} [breaking change]` : commit

const commitConfirm = await confirm({
  initialValue: true,
  message: `${colors.cyan('Quieres crear el commit con el siguiente mensaje')}
            ${colors.green(colors.bold(commit))}
            Confirmas?`
})

if (!commitConfirm) {
  outro(colors.yellow('No se ha creado el commit'))
  process.exit(0)
}

await gitCommit({ commit })

outro('Commit creado con exito')
