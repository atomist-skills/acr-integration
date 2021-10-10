#! /bin/bash
#
# Copyright © 2020 Atomist, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

declare Pkg=skill
declare Version=0.1.0

set -o pipefail

function main() {
  if [[ "$1" =~ ^https?:\/\/.*$ ]]; then
    curl -s "$1" | bash -s ${@:2}
  else
    local clone_dir=${TMPDIR}${ATOMIST_CORRELATION_ID}
    git clone https://github.com/$1.git $clone_dir
    if [ -z "$2" ]; then
      bash $clone_dir/skill.bash
    else
      bash $clone_dir/$2 ${@:3}
    fi
  fi
}

main "$@"
