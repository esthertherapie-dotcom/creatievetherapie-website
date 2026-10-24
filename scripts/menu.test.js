import { test } from "node:test";
import assert from "node:assert/strict";
import { markCurrent } from "../eleventy.config.js";

test("markeert elk menu-item dat naar de huidige pagina linkt", () => {
  const menu = '<li class="menu-item"><a href="/">Nieuws</a></li>'
    + '<li class="menu-item menu-item-has-children"><a href="/wie/">Team</a><ul class="sub-menu">'
    + '<li class="menu-item"><a href="/wie/">Team</a></li><li class="menu-item"><a href="/wie-anders/">X</a></li></ul></li>';
  assert.equal(markCurrent(menu, "/wie/"),
    '<li class="menu-item"><a href="/">Nieuws</a></li>'
    + '<li class="menu-item menu-item-has-children current-menu-item"><a href="/wie/" aria-current="page">Team</a><ul class="sub-menu">'
    + '<li class="menu-item current-menu-item"><a href="/wie/" aria-current="page">Team</a></li><li class="menu-item"><a href="/wie-anders/">X</a></li></ul></li>');
});
