"""Nuru Faith youth app — restricted, aggregate-only Supabase insights."""
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import streamlit as st

st.set_page_config(page_title="Nuru Faith | Admin Insights", page_icon="💙", layout="wide")

st.markdown("""<style>
.stApp {background:linear-gradient(140deg,#091525,#102942);color:#eaf4ff}
.block-container {max-width:1220px;padding-top:2.6rem}
div[data-testid="stMetric"] {background:#142f49;border:1px solid #28516b;padding:22px;border-radius:17px}
div[data-testid="stMetricLabel"] {color:#b7cfe2}
.stButton>button {background:#b9ef54;color:#122a24;border-radius:10px;border:0;font-weight:700}
</style>""", unsafe_allow_html=True)

st.title("Nuru Faith — Admin Insights")
st.caption("Youth app · Restricted aggregate content reporting")

try:
    url = str(st.secrets["SUPABASE_URL"]).rstrip("/")
    anon_key = str(st.secrets["SUPABASE_ANON_KEY"])
except (KeyError, FileNotFoundError):
    st.warning("Connection setup required: add SUPABASE_URL and SUPABASE_ANON_KEY in Streamlit Cloud → App settings → Secrets.")
    st.stop()

def post_json(endpoint, payload, access_token=None):
    headers = {"apikey": anon_key, "Content-Type": "application/json"}
    if access_token:
        headers["Authorization"] = "Bearer " + access_token
    req = Request(url + endpoint, data=json.dumps(payload).encode(), headers=headers, method="POST")
    try:
        with urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode())
    except HTTPError as error:
        if error.code in (400, 401, 403):
            raise ValueError("Invalid credentials or insufficient administrator permissions.") from None
        raise ValueError("Supabase request failed. Please try again.") from None
    except URLError:
        raise ValueError("Unable to reach Supabase. Please try again.") from None

if "nuru_access_token" not in st.session_state:
    st.subheader("Administrator sign in")
    st.info("Only Nuru Faith super administrators can view this dashboard. No private member data is displayed.")
    with st.form("admin_login"):
        email = st.text_input("Admin email")
        password = st.text_input("Password", type="password")
        submit = st.form_submit_button("Sign in securely")
    if submit:
        try:
            data = post_json("/auth/v1/token?grant_type=password", {"email":email.strip(),"password":password})
            token = data["access_token"]
            # Permission is enforced server-side by the database RPC.
            post_json("/rest/v1/rpc/nuru_streamlit_admin_counts", {}, token)
            st.session_state["nuru_access_token"] = token
            st.rerun()
        except (ValueError, KeyError):
            st.error("Sign-in failed or this account is not a super administrator.")
    st.stop()

if st.button("Sign out"):
    st.session_state.pop("nuru_access_token", None)
    st.rerun()

try:
    counts = post_json("/rest/v1/rpc/nuru_streamlit_admin_counts", {}, st.session_state["nuru_access_token"])
except ValueError:
    st.session_state.pop("nuru_access_token", None)
    st.error("Your session has expired or you do not have access. Please sign in again.")
    st.stop()

st.success("Connected to Nuru Faith youth app · Supabase live aggregates")
labels = [("Reels","reels"),("Songs (tracks)","songs"),("Sermon media","sermons"),("Media sources","artists"),("Courses","courses")]
for col, (label,key) in zip(st.columns(5),labels):
    col.metric(label, f"{int(counts.get(key,0)):,}")
st.caption("Media sources are not necessarily unique approved artists. Sermon media counts depend on the media-type classification.")
st.subheader("Content library")
for col,(label,key) in zip(st.columns(5),[("Devotionals","devotionals"),("Media items","media_items"),("Scripture series","scripture_series"),("Churches","churches"),("Approved channels","approved_channels")]):
    col.metric(label, f"{int(counts.get(key,0)):,}")
st.caption("Read-only totals. No messages, prayer requests, profiles or personal account records are queried.")
