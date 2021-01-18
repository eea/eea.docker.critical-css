const generator = require('./critical')
const path = require('path')
const pkgJson = require(path.join(__dirname, 'package.json'))
const fs = require('fs-extra')

const postcss = require('postcss')
const postcssrc = require('postcss-load-config')

const { version } = pkgJson

function minifyCss (css, file) {
  const ctx = {}

  return postcssrc(ctx)
    .then((config) => {
      const options = { ...config.options }
      options.from = undefined
      return postcss(config.plugins)
        .process(css, options)
    })
    .catch((err) => {
      throw err
    })
}

function main (urls, options) {
  console.log(`Run generation on: ${urls.join(', ')}`)

  let { dimensions, output } = options
  dimensions = dimensions || '1300x900'
  output = output ?? './critical.css'

  if (!output.endsWith('css')) {
    throw new Error('Output location needs to be a file path like /var/output/output.css')
  }

  const promises = urls.map((url, index) => {
    const fname = `critical-partial-${index}.css`
    const promise = generator
      .generateCritical(url, dimensions, path.join(path.dirname(output), fname))
    return promise
  })

  let css

  Promise.all(promises).then(allCss => {
    console.log(`Processing ${allCss.length} css fragment(s)`)

    css = allCss.join(';\n')

    minifyCss(css, output).then(result => {
      console.log(`Generated ${result.css.length} bytes`)
      fs.outputFile(output, result.css)
      console.log('Done, will shut down')
    })
  })
    .catch((err) => {
      console.error(err.name)
      console.error(err.message)
    })
}

const { Command } = require('commander')
const program = new Command()

program
  .version(version)
  .arguments('<url...>')
  .option('-o, --output <output>', 'Output directory')
  .option(
    '-d, --dimensions <dimensions>',
    'Comma-separated dimension rectangles, like "1300x900,1600x1000"')
  .action(main)

program.parse(process.args, process.argv)
