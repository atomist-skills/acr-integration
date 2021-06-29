;; Licensed under the Apache License, Version 2.0 (the "License");
;; you may not use this file except in compliance with the License.
;; You may obtain a copy of the License at
;;
;;     http://www.apache.org/licenses/LICENSE-2.0
;;
;; Unless required by applicable law or agreed to in writing, software
;; distributed under the License is distributed on an "AS IS" BASIS,
;; WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
;; See the License for the specific language governing permissions and
;; limitations under the License.
;; Copyright © 2021 Atomist, Inc.
;;
;; Licensed under the Apache License, Version 2.0 (the "License");
;; you may not use this file except in compliance with the License.
;; You may obtain a copy of the License at
;;
;;     http://www.apache.org/licenses/LICENSE-2.0
;;
;; Unless required by applicable law or agreed to in writing, software
;; distributed under the License is distributed on an "AS IS" BASIS,
;; WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
;; See the License for the specific language governing permissions and
;; limitations under the License.

(ns atomist.acr
  (:require
   [goog.string :as gstring]
   [atomist.time]
   [atomist.cljs-log :as log]
   [atomist.async :refer-macros [go-safe <?]]
   [cljs.core.async :refer [close! go chan <! >!]]
   [atomist.docker :as docker]
   [cljs-node-io.core :as io]
   ["tmp" :as tmp]
   [atomist.json :as json]))

(enable-console-print!)

(defn account-host
  [account-id region]
  ;; TODO
  (gstring/format "" account-id region))

(defn- empty-tmp-dir
  "we can only write AWS SDK config to a tmp dir on GCF"
  []
  (let [c (chan)]
    (.dir tmp
          (clj->js {:keep false :prefix (str "atm-" (. js/process -pid))})
          (fn [err path]
            (go
              (if err
                (>! c (ex-info "could not create tmp dir" {:err err}))
                (>! c path))
              (close! c))))
    c))

(defn acr-auth
  [{:keys [region access-key-id secret-access-key]}]
  (go-safe
   (log/infof "Authenticating ACR in region %s" region)
   ;; TODO
   {:access-token ""}))

(defn get-labelled-manifests
  "log error or return labels"
  [{:keys [account-id region access-key-id secret-access-key]} repository tag-or-digest]
  (log/infof "get-image-info:  %s@%s/%s" region access-key-id tag-or-digest)
  (go-safe
   (let [auth-context (<? (acr-auth {:region region
                                     :secret-access-key secret-access-key
                                     :access-key-id access-key-id}))]
     (<? (docker/get-labelled-manifests
          (account-host account-id region)
          (:access-token auth-context) repository tag-or-digest)))))

