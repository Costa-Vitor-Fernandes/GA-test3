  module.exports = {

            extends: ['@commitlint/config-conventional'],

            rules: {

              'type-enum': [

                2,

                'always',

                [

                  'feat',     // Nova funcionalidade

                  'fix',      // Correção de bug

                  'docs',     // Apenas documentação

                  'style',    // Formatação, sem mudança de código

                  'refactor', // Refatoração sem mudança de funcionalidade

                  'perf',     // Melhoria de performance

                  'test',     // Adição/correção de testes

                  'chore',    // Tarefas de build, configs, etc

                  'ci',       // Mudanças em CI/CD

                  'build',    // Mudanças no sistema de build

                  'revert'    // Reversão de commit

                ]

              ],

              'subject-case': [0]

            }

          }; 