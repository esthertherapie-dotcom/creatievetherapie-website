import { test } from "node:test";
import assert from "node:assert/strict";
import { markCurrent } from "../eleventy.config.js";

test("markeert elk menu-item dat naar de huidige pagina linkt", () => {
  const menu = '<li class="menu-item"><a href="/">Nieuws</a></li>'
    + '<li class="menu-item menu-item-has-children"><a href="/wie/">Team</a><ul class="sub-menu">'
    + '<li class="menu-item"><a href="/wie/">Team</a></li><li class="menu-item"><a href="/wie-anders/">X</a></li></ul></li>';
  assert.equal(markCurrent(menu, "/wie/"),
    '<li class="menu-item"><a href="/">Nieuws</a></li>'
    + '<li class="menu-item menu-item-has-children current-menu-item current-menu-ancestor"><a href="/wie/" aria-current="page">Team</a><ul class="sub-menu">'
    + '<li class="menu-item current-menu-item"><a href="/wie/" aria-current="page">Team</a></li><li class="menu-item"><a href="/wie-anders/">X</a></li></ul></li>');
});

// navigation.js klapt .current-menu-ancestor > .sub-menu open in het mobiele menu.
test("markeert alle ouders van het huidige item als current-menu-ancestor", () => {
  const menu = '<ul><li class="menu-item menu-item-has-children"><a href="/wie/">Team</a><ul class="sub-menu">'
    + '<li class="menu-item menu-item-has-children"><a href="/esther/">Esther</a><ul class="sub-menu">'
    + '<li class="menu-item"><a href="/dans/">Dans</a></li></ul></li></ul></li>'
    + '<li class="menu-item menu-item-has-children"><a href="/hoe/">Praktisch</a><ul class="sub-menu">'
    + '<li class="menu-item"><a href="/tarief/">Tarief</a></li></ul></li></ul>';
  const out = markCurrent(menu, "/dans/");
  assert.match(out, /<li class="menu-item menu-item-has-children current-menu-ancestor"><a href="\/wie\/">/);
  assert.match(out, /<li class="menu-item menu-item-has-children current-menu-ancestor"><a href="\/esther\/">/);
  assert.match(out, /<li class="menu-item menu-item-has-children"><a href="\/hoe\/">/);
});
