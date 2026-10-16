import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { python } from '@codemirror/lang-python'
import { indentWithTab } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting, indentUnit } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

const theme = EditorView.theme(
  {
    '&': { color: '#e3e5ee', backgroundColor: 'transparent', fontSize: '13.5px', height: '100%' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.65' },
    '.cm-content': { caretColor: '#b3abf2', padding: '12px 0' },
    '.cm-cursor': { borderLeftColor: '#b3abf2', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'rgba(144,133,233,.28) !important' },
    '.cm-gutters': { backgroundColor: 'transparent', color: '#4d5366', border: 'none', paddingRight: '6px' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#9aa0b4' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,.025)' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(25,158,112,.25)', outline: 'none' },
    '.cm-tooltip': { backgroundColor: '#1d212a', border: '1px solid rgba(255,255,255,.12)', borderRadius: '8px' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'rgba(144,133,233,.3)' },
    '.cm-foldPlaceholder': { backgroundColor: '#1d212a', border: 'none', color: '#9aa0b4' },
  },
  { dark: true },
)

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword], color: '#b3abf2' },
  { tag: [t.function(t.variableName), t.function(t.definition(t.variableName))], color: '#6da7ec' },
  { tag: [t.definition(t.variableName)], color: '#e3e5ee' },
  { tag: [t.number, t.bool, t.null], color: '#ec835a' },
  { tag: [t.string, t.special(t.string)], color: '#3fc792' },
  { tag: [t.comment], color: '#5f667a', fontStyle: 'italic' },
  { tag: [t.operator, t.punctuation], color: '#9aa0b4' },
  { tag: [t.className, t.typeName], color: '#fab219' },
  { tag: [t.self, t.atom], color: '#e87ba4' },
  { tag: [t.propertyName], color: '#86b6ef' },
])

export function createEditor(parent, doc, { onChange, onRun }) {
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        python(),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        keymap.of([{ key: 'Mod-Enter', run: () => (onRun(), true) }, indentWithTab]),
        theme,
        syntaxHighlighting(highlight),
        EditorView.updateListener.of((u) => u.docChanged && onChange(u.state.doc.toString())),
      ],
    }),
  })
}

export function setDoc(view, doc) {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } })
}
