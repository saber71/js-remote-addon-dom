import { Remote, TestRemoteConnector } from "@heraclius/remote"
import { RemoteAddonDom } from "../../src"

const connector = new TestRemoteConnector()
const remote = new Remote(connector)
remote.addAddon(new RemoteAddonDom())
connector.open()
window.onload = () => {
  connector.sendFromClient(
    JSON.stringify({
      type: "create-dom",
      element: "div",
      attributes: { style: "color:red", id: "123" },
      listenEvents: ["click"],
      children: [
        {
          type: "create-dom",
          element: "span",
          textContent: "child",
          attributes: { style: "color:blue;background:black;", id: "child" }
        },
        {
          type: "create-dom",
          element: "input",
          attributes: { style: "color:blue;background:red;", id: "input" }
        }
      ]
    })
  )
  connector.on("dispatch:click", () => {
    connector.sendFromClient(
      JSON.stringify([
        {
          type: "update-dom",
          id: "child",
          textContent: "clicked"
        },
        {
          type: "remove-dom",
          id: "input"
        }
      ])
    )
  })
}
