/**
 * Help Command
 */

// Version is injected at build time via Vite's define
declare const __CLI_VERSION__: string;
export const VERSION = typeof __CLI_VERSION__ !== 'undefined' ? __CLI_VERSION__ : 'dev';

export async function help(): Promise<void> {
  console.log(`
Fox Pilot CLI v${VERSION}
Browser automation for AI agents via Firefox

USAGE:
  fox-pilot <command> [args] [options]

NAVIGATION:
  open <url>                    Navigate to URL
  back                          Go back
  forward                       Go forward
  reload                        Reload page

SNAPSHOT:
  snapshot                      Get accessibility tree with refs
    -i, --interactive           Show only interactive elements
    -c, --compact               Remove empty structural elements
    -d, --depth <n>             Limit tree depth
    -s, --scope <selector>      Scope to selector

INTERACTION:
  click <selector>              Click element
  dblclick <selector>           Double-click element
  fill <selector> <text>        Clear and fill input
  type <selector> <text>        Type into element (append)
  press <key> [selector]        Press key (Enter, Tab, Control+a)
  select <selector> <value>     Select dropdown option
  check <selector>              Check checkbox
  uncheck <selector>            Uncheck checkbox
  hover <selector>              Hover element
  scroll <dir|selector> [px]    Scroll (up/down/left/right or to element)

GET INFORMATION:
  get text <selector>           Get text content
  get html <selector>           Get innerHTML
  get value <selector>          Get input value
  get attr <selector> <attr>    Get attribute
  get title                     Get page title
  get url                       Get current URL
  get count <selector>          Count matching elements

STATE CHECKS:
  is visible <selector>         Check if visible
  is enabled <selector>         Check if enabled
  is checked <selector>         Check if checked

SCREENSHOTS:
  screenshot [path]             Take screenshot
    -f, --full                  Full page screenshot

WAITING:
  wait <selector>               Wait for element visible
  wait <ms>                     Wait for duration
  wait --text "..."             Wait for text to appear
  wait --url "..."              Wait for URL pattern

SEMANTIC LOCATORS:
  find role <role> [action]     Find by ARIA role
  find text <text> [action]     Find by text content
  find label <label> [action]   Find by label
  find placeholder <ph> [action] Find by placeholder
    --name "..."                Filter by accessible name
    --index <n>                 Select nth match
    --exact                     Exact text match

TABS:
  tab                           List all tabs
  tab new [url]                 Open new tab
  tab close [id]                Close tab
  tab <index>                   Switch to tab

INSTALLATION:
  install                       Install native messaging host
  uninstall                     Uninstall native messaging host

OTHER:
  eval <javascript>             Execute JavaScript
  help                          Show this help
  version                       Show version

OPTIONS:
  --json                        Output as JSON

SELECTORS:
  @e1, @e2, ...                 Refs from snapshot (recommended)
  #id                           CSS ID selector
  .class                        CSS class selector
  element                       CSS tag selector

EXAMPLES:
  fox-pilot open example.com
  fox-pilot snapshot -i -c
  fox-pilot click @e2
  fox-pilot fill @e3 "user@example.com"
  fox-pilot find role button click --name "Submit"
  fox-pilot wait --text "Success"
  fox-pilot screenshot /tmp/result.png
`);
}

export async function version(): Promise<void> {
  console.log(`Fox Pilot CLI v${VERSION}`);
}
