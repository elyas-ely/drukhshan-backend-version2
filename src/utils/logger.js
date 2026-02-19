import chalk from 'chalk'

export const logger = {
  info: (message) => {
    console.log(chalk.blue(`[INFO]  - ${message}`))
  },

  success: (message) => {
    console.log(chalk.green(`[SUCCESS] - ${message}`))
  },

  warning: (message) => {
    console.log(chalk.yellow.bold(`[WARNING] ------------- ${message}`))
  },

  error: (message, error = null) => {
    console.error(chalk.red.bold(`[ERROR] --------------${message}`))
    if (error) {
      console.error(chalk.red.bold('Error details:'), error)
    }
  },

  debug: (message, data = null) => {
    console.log(chalk.magenta(`[DEBUG] - ${message}`))
    if (data) {
      console.log(chalk.magenta('Debug data:'), data)
    }
  },

  api: (method, path, status) => {
    const color =
      status >= 500
        ? 'red'
        : status >= 400
          ? 'yellow'
          : status >= 300
            ? 'cyan'
            : status >= 200
              ? 'green'
              : 'white'

    console.log(
      chalk.gray(`[API] - `) +
        chalk.white(`${method} ${path} - `) +
        chalk[color](`Status: ${status}`)
    )
  },
}
