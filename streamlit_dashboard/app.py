"""Nuru Faith youth app — restricted, aggregate-only Supabase insights."""
import json
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from datetime import datetime, timezone

import streamlit as st
import altair as alt

st.set_page_config(page_title="Nuru Faith | Admin Insights", page_icon="💙", layout="wide")

st.markdown("""<style>
[data-testid="stSidebar"]{background:#071827;border-right:1px solid #1c3d55}
[data-testid="stSidebar"] [role="radiogroup"] label{border-radius:10px;padding:5px 7px}
[data-testid="stSidebar"] [role="radiogroup"] label:hover{background:#15344a}
h1,h2,h3{letter-spacing:-.025em}
[data-testid="stMetricValue"]{font-size:clamp(1.5rem,2vw,2.2rem);font-weight:750}
[data-testid="stAlert"]{border-radius:12px}
@media(max-width:700px){.block-container{padding:1rem .85rem 3rem!important}div[data-testid="stMetric"]{padding:13px}h1{font-size:1.7rem!important}}
.stApp {background:linear-gradient(140deg,#091525,#102942);color:#eaf4ff}
.block-container {max-width:1220px;padding-top:2.6rem}
div[data-testid="stMetric"] {background:#142f49;border:1px solid #28516b;padding:22px;border-radius:17px}
div[data-testid="stMetricLabel"] {color:#b7cfe2}
.stButton>button {background:#b9ef54;color:#122a24;border-radius:10px;border:0;font-weight:700}
</style>""", unsafe_allow_html=True)

st.title("✦ Nuru Social Studio")
st.caption("Nuru Faith · Secure Super Admin workspace · Live aggregate insights")

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

st.success("Connected to Nuru Faith youth app · Live Supabase analytics")
with st.sidebar:
    st.header("✦ Nuru Studio")
    st.caption("Command center · Youth app")
    page = st.radio("Workspace", ["Social home", "Overview", "Content intelligence", "Moderation queue", "Growth trends", "Performance", "App Health", "System health"])
    if st.button("↻ Refresh live data", use_container_width=True):
        st.rerun()
    st.divider()
    st.link_button("Main admin panel ↗", "https://app.nurufaith.co.ke/admin", use_container_width=True)
    st.caption("Role: verified super administrator")
    st.caption("All metrics are aggregated. Sensitive personal records are excluded.")

try:
    advanced = post_json("/rest/v1/rpc/nuru_streamlit_admin_advanced", {}, st.session_state["nuru_access_token"])
except ValueError:
    advanced = None
    st.warning("Advanced reporting is temporarily unavailable. Basic insights remain accessible.")

def cards(items):
    for col, (label, value) in zip(st.columns(len(items)), items):
        try:
            shown = f"{int(value):,}" if value is not None else "—"
        except (TypeError, ValueError):
            shown = "—"
        col.metric(label, shown)

def category_chart(rows):
    data = [{"Category": str(row.get("name", "Unknown")), "Count": int(row.get("count") or 0)} for row in (rows or []) if isinstance(row, dict)]
    if not data:
        st.info("No categorized data available yet.")
        return
    chart = (alt.Chart(alt.Data(values=data))
        .mark_bar(cornerRadiusEnd=6, color="#67d5e9")
        .encode(x=alt.X("Count:Q", title="Records", axis=alt.Axis(format="d")),
                y=alt.Y("Category:N", sort="-x", title=None),
                tooltip=["Category:N", alt.Tooltip("Count:Q", format=",")])
        .properties(height=max(170, len(data)*39)))
    st.altair_chart(chart, use_container_width=True)


def trend_chart(rows, date_key, value_key, label, *, height=300):
    data = []
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        try:
            data.append({"Period": str(row[date_key]), "Value": int(row.get(value_key) or 0)})
        except (KeyError, ValueError, TypeError):
            continue
    if not data:
        st.info("No measured activity available for this period.")
        return
    selection = alt.selection_point(fields=["Period"], on="pointerover", nearest=True, empty=False)
    base = alt.Chart(alt.Data(values=data)).encode(
        x=alt.X("Period:N", sort=None, title=None, axis=alt.Axis(labelAngle=-35)),
        y=alt.Y("Value:Q", title=label, axis=alt.Axis(format="d"), scale=alt.Scale(zero=True)))
    area = base.mark_area(opacity=0.16, color="#54c9f2")
    line = base.mark_line(point=True, strokeWidth=3, color="#79d8fa")
    tooltip = base.mark_circle(size=110, opacity=0).encode(
        tooltip=[alt.Tooltip("Period:N"), alt.Tooltip("Value:Q", title=label, format=",")]).add_params(selection)
    st.altair_chart((area + line + tooltip).properties(height=height).interactive(), use_container_width=True)


def weekly_chart(rows):
    trend_chart(rows, "week", "count", "New items", height=260)


def approval_chart(approved, pending, title):
    if approved is None or pending is None:
        st.info("Approval status is unavailable.")
        return
    data = [{"Status": "Approved", "Items": int(approved)}, {"Status": "Pending", "Items": int(pending)}]
    if sum(row["Items"] for row in data) == 0:
        st.info("No approval records to visualize yet.")
        return
    chart = (alt.Chart(alt.Data(values=data)).mark_arc(innerRadius=72, outerRadius=110)
        .encode(theta=alt.Theta("Items:Q"),
                color=alt.Color("Status:N", scale=alt.Scale(domain=["Approved","Pending"], range=["#71e2ba","#f8bb67"])),
                tooltip=["Status:N", alt.Tooltip("Items:Q", format=",")])
        .properties(height=260, title=title))
    st.altair_chart(chart, use_container_width=True)


try:
    social = post_json("/rest/v1/rpc/nuru_streamlit_social_pulse", {}, st.session_state["nuru_access_token"])
except ValueError:
    social = None

if page == "Social home":
    st.header("Community pulse")
    st.caption("Snapshot: " + datetime.now(timezone.utc).strftime("%d %b %Y · %H:%M UTC") + " · Protected Supabase reporting.")
    st.caption("Social-platform inspired creator analytics · Real Nuru Faith engagement")
    if social:
        cards([("Posts",social.get("posts")),("Post likes",social.get("post_likes")),("Comments",social.get("post_comments")),("Reel views",social.get("reel_views"))])
        cards([("Reel likes",social.get("reel_likes")),("Follows",social.get("follows")),("Posts · 7d",social.get("posts_week")),("Views · 7d",social.get("views_week"))])
        st.subheader("Social activity · Last 14 days")
        activity = social.get("weekly_activity",[])
        if activity:
            trend_chart(activity, "day", "views", "Reel views")
            st.caption("Daily reel views; no private activity details are displayed.")
        else:
            st.info("No activity recorded yet.")
    else:
        st.warning("Social analytics are temporarily unavailable.")
    st.subheader("Creator dashboard")
    cards([("Reels",counts.get("reels")),("Music",counts.get("songs")),("Podcasts",counts.get("podcasts")),("Pending media",counts.get("pending_media"))])
    st.caption("Platform-wide totals, not an individual creator's private account.")

elif page == "Overview":
    st.header("Executive overview")
    cards([("Media library", counts.get("media_items")), ("Music", counts.get("songs")), ("Podcasts", counts.get("podcasts")), ("Reels", counts.get("reels"))])
    cards([("Devotionals", counts.get("devotionals")), ("Scripture series", counts.get("scripture_series")), ("Courses", counts.get("courses")), ("Churches", counts.get("churches"))])
    st.subheader("Publishing and approval")
    chart_left, chart_right = st.columns(2)
    with chart_left:
        approval_chart(counts.get("approved_media"), counts.get("pending_media"), "Media approval")
    with chart_right:
        approval_chart(counts.get("approved_sources"), counts.get("pending_sources"), "Source approval")
    cards([("Approved media", counts.get("approved_media")), ("Pending media", counts.get("pending_media")), ("Approved sources", counts.get("approved_sources")), ("Pending sources", counts.get("pending_sources"))])
    if advanced:
        st.subheader("Last 7 days")
        cards([("New media", advanced.get("media_last_7d")), ("New reels", advanced.get("reels_last_7d")), ("Registered profiles", advanced.get("users_total")), ("Administrators", advanced.get("admins_total"))])

elif page == "Content intelligence":
    st.header("Content intelligence")
    st.caption("Classified from the live catalog. A media source is not necessarily a unique artist.")
    cards([("Music", counts.get("songs")), ("Podcasts", counts.get("podcasts")), ("Sources", counts.get("media_sources")), ("Approved channels", counts.get("approved_channels"))])
    if advanced:
        left, right = st.columns(2)
        with left:
            st.subheader("Media formats")
            category_chart(advanced.get("media_categories", []))
        with right:
            st.subheader("Source classifications")
            category_chart(advanced.get("source_kinds", []))
    st.info("The catalog does not currently contain a distinct sermon media_type. Podcast totals must not be presented as verified sermon totals.")

elif page == "Moderation queue":
    st.header("Moderation command center")
    cards([("Media awaiting approval", counts.get("pending_media")), ("Sources awaiting approval", counts.get("pending_sources")), ("Pending reports", advanced.get("pending_reports") if advanced else 0)])
    st.caption("Every decision is permission-checked in Supabase and recorded in the audit log.")
    queue_name = st.selectbox("Review queue", ["Media items", "Media sources"])
    queue_kind = "media_items" if queue_name == "Media items" else "media_sources"
    try:
        pending = post_json("/rest/v1/rpc/nuru_admin_pending", {"p_kind":queue_kind,"p_limit":30}, st.session_state["nuru_access_token"])
    except ValueError:
        pending = []
        st.error("Unable to load moderation queue.")
    if not pending:
        st.info("No pending items found in this queue.")
    else:
        st.caption(f"Showing {len(pending)} pending records (up to 30).")
        choices = {str(item["id"]): item for item in pending}
        chosen = st.selectbox("Choose an item to review", list(choices.keys()), format_func=lambda uid: str(choices[uid].get("title","Untitled")) + " · " + str(choices[uid].get("kind","")))
        selected = choices[chosen]
        st.write("**Selected:**", selected.get("title","Untitled"))
        st.write("**Type:**", selected.get("kind","Unknown"))
        st.write("**Record ID:**", chosen)
        st.warning("Review licensing, attribution, identity and content suitability before making a decision. This screen does not preview the underlying media.")
        with st.form("moderation_decision"):
            decision = st.radio("Decision", ["Approve", "Reject"], horizontal=True)
            confirmation = st.checkbox("I have independently reviewed this item and understand this decision changes its approval status.")
            submitted = st.form_submit_button("Apply reviewed decision")
        if submitted:
            if not confirmation:
                st.error("Confirm your review before submitting.")
            else:
                try:
                    post_json("/rest/v1/rpc/nuru_admin_review", {"p_kind":queue_kind,"p_id":chosen,"p_action":decision.lower()}, st.session_state["nuru_access_token"])
                    st.success("Decision saved and audit-logged.")
                    st.rerun()
                except ValueError:
                    st.error("The decision could not be saved. No success was confirmed.")
    st.caption("Actions are limited to approval status for the selected record. User accounts, roles and messages cannot be modified here.")

elif page == "Performance":
    st.header("⚡ Lighthouse performance & quality")
    st.caption("Live on-demand Google PageSpeed Insights · Public Nuru Faith homepage · Mobile and desktop")
    st.info("Measures four Lighthouse categories: Performance, Accessibility, Best Practices and SEO. Scores are not fabricated when the API is unavailable.")

    @st.cache_data(ttl=1800, show_spinner=False)
    def lighthouse_audit(strategy):
        params = [("url", "https://nurufaith.co.ke/"), ("strategy", strategy)]
        params.extend(("category", category) for category in ("performance", "accessibility", "best-practices", "seo"))
        request = Request("https://www.googleapis.com/pagespeedonline/v5/runPagespeed?" + urlencode(params),
                          headers={"User-Agent": "NuruFaithAdminPerformance/1.0"})
        try:
            with urlopen(request, timeout=90) as response:
                report = json.loads(response.read().decode())
        except (HTTPError, URLError, TimeoutError, ValueError):
            return None
        result = report.get("lighthouseResult") or {}
        if not result.get("categories") or not result.get("audits"):
            return None
        return result

    if st.button("Run / refresh Lighthouse audits", key="lighthouse_refresh"):
        lighthouse_audit.clear()

    for strategy in ("mobile", "desktop"):
        st.subheader(strategy.title() + " Lighthouse")
        with st.spinner("Checking " + strategy + " homepage performance…"):
            report = lighthouse_audit(strategy)
        if not report:
            st.warning("Fresh audit unavailable (network, rate limit or API error). No score has been assumed.")
            continue
        categories = report.get("categories", {})
        columns = st.columns(4)
        for column, key, title in zip(columns, ("performance", "accessibility", "best-practices", "seo"),
                                       ("Performance", "Accessibility", "Best Practices", "SEO")):
            score = categories.get(key, {}).get("score")
            with column:
                if isinstance(score, (float, int)):
                    number = round(score * 100)
                    st.metric(title, str(number) + "/100")
                    st.progress(number)
                else:
                    st.metric(title, "Not measured")
        audits = report.get("audits", {})
        metrics = ("largest-contentful-paint", "first-contentful-paint", "total-blocking-time", "cumulative-layout-shift")
        st.caption(" · ".join(key.replace("-", " ").title() + ": " +
                             str(audits.get(key, {}).get("displayValue", "n/a")) for key in metrics))
    st.caption("Target: mobile performance at least 80. Results are lab data for the public homepage, not real-user data or authenticated app routes. API results may be cached for up to 30 minutes.")
    st.link_button("GitHub Lighthouse history", "https://github.com/kanyisteven44-bot/Nuru-faith/actions/workflows/performance.yml")

elif page == "App Health":
    st.header("App Health & Error Center")
    st.caption("Check public site availability and find simple, safe troubleshooting steps.")
    if st.button("Check public websites", key="health_refresh"):
        st.session_state["health_requested"] = True
    if st.session_state.get("health_requested"):
        for name, target in (("Homepage", "https://nurufaith.co.ke/"), ("App", "https://app.nurufaith.co.ke/")):
            try:
                with urlopen(Request(target, headers={"User-Agent": "NuruFaithHealth/1.0"}), timeout=12) as response:
                    st.success(name + " responded: HTTP " + str(response.status))
            except HTTPError as error:
                st.error(name + " returned HTTP " + str(error.code) + ". Inspect Vercel deployment and domain settings.")
            except (URLError, TimeoutError, ValueError):
                st.warning(name + " could not be checked. Network or hosting may be involved.")
    st.info("These checks do not read private logs or prove that login, messaging or media playback works.")
    guides = [
        ("Voice notes unavailable", "Check that the recording exists in Supabase Storage; inspect expired signed URLs, upload errors and access permissions.", "https://supabase.com/dashboard"),
        ("Changes not showing", "Compare the live Vercel production commit with GitHub main; resolve build errors or deployment quotas, then deploy and verify.", "https://vercel.com/vortiqora/nuru-faith"),
        ("Login problems", "Review Supabase Auth logs and allowed redirect URLs. Never disable row-level security to bypass an error.", "https://supabase.com/dashboard"),
        ("Slow pages", "Run Lighthouse in Performance; investigate the measured LCP element, large images, scripts and slow requests before optimizing.", "https://github.com/kanyisteven44-bot/Nuru-faith/actions/workflows/performance.yml"),
    ]
    st.subheader("Errors explained and how to fix them")
    for title, steps, link in guides:
        with st.expander(title):
            st.write(steps)
            st.link_button("Open diagnostic tools", link)
    st.caption("These are guidance examples, not automatically detected incidents. Confirm the cause before applying a fix.")
    st.subheader("Guided root-cause diagnosis")
    problems = {
        "Voice messages": ("Supabase Storage / media requests", [
            "Check whether the file exists and whether other recordings play.",
            "Inspect the failing media request: 401/403 suggests access or signed URL issues, 404 suggests a missing path.",
            "Fix the verified issue, then test playback with a new recording."
        ]),
        "Login / signup": ("Supabase Authentication logs", [
            "Reproduce with an authorized test account and record the error time.",
            "Check the Auth log and allowed redirect URLs.",
            "Fix the specific authentication error; do not disable RLS."
        ]),
        "Missing updates": ("GitHub CI and Vercel deployments", [
            "Compare the latest passing GitHub commit with the live READY deployment.",
            "Inspect build logs and quota errors if they differ.",
            "Deploy a passing commit and verify the live site."
        ]),
        "Slow loading": ("Lighthouse and network timing", [
            "Run the mobile Lighthouse audit for the app URL.",
            "Inspect LCP, TBT and slow requests.",
            "Fix the largest measured bottleneck and rerun the audit."
        ]),
        "Missing reels or music": ("Supabase queries, approval states and RLS", [
            "Confirm content exists and is approved.",
            "Inspect failed API requests and role-based access.",
            "Fix the verified filter or permission issue and test with a normal user."
        ]),
    }
    selected_problem = st.selectbox("What is not working?", list(problems))
    source, steps = problems[selected_problem]
    st.write("Where to investigate:", source)
    for number, step in enumerate(steps, 1):
        st.write(str(number) + ". " + step)
    st.caption("A suggested cause is not a confirmed incident. Never expose access tokens or private member records.")


elif page == "Growth trends":
    st.header("Growth and publishing trends")
    st.caption("Weekly upload counts over the past 12 weeks; not user activity or listening analytics.")
    if advanced:
        st.subheader("New media by week")
        weekly_chart(advanced.get("weekly_media", []))
        st.subheader("New reels by week")
        weekly_chart(advanced.get("weekly_reels", []))
    else:
        st.info("Advanced trends are not available right now.")

else:
    st.header("System health and data integrity")
    st.success("The protected basic analytics endpoint is responding.")
    st.write("Advanced reporting endpoint:", "Connected" if advanced is not None else "Unavailable")
    st.write("Social analytics endpoint:", "Connected" if social is not None else "Unavailable")
    st.write("Access policy: authenticated super_admin only")
    st.write("Database access: read-only aggregate functions")
    st.write("Member messages, prayer requests, passwords and tokens: never displayed")
    st.write("Data caveats: media sources are not necessarily distinct artists; sermons are not separately classified.")
    if advanced:
        cards([("Registered profiles", advanced.get("users_total")), ("Administrators", advanced.get("admins_total")), ("Media in 7 days", advanced.get("media_last_7d"))])

st.divider()
st.caption("Nuru Faith youth app · Administrator-only insights · No destructive actions")
