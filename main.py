import streamlit as st
import json
import streamlit.components.v1 as components
import pandas as pd
from textblob import TextBlob
import streamlit_highcharts as stc
from streamlit_option_menu import option_menu
import random
import os
from streamlit_extras.grid import grid
import google.generativeai as genai
from dotenv import load_dotenv
from streamlit_extras.metric_cards import style_metric_cards
load_dotenv()
import re
from collections import Counter

# Configure the Google Generative AI API
genai.configure(
    api_key=os.environ['API_KEY']
)

# Initialize chat
model = genai.GenerativeModel(
    "gemini-1.5-pro-latest"
)
chat = model.start_chat()


# Helper function to generate a response
def respond(user_input, instruction=""):
    response = chat.send_message(instruction + user_input)
    return response.text


# Set up the page configuration
st.set_page_config(page_title='Social Media Analytics',
                   page_icon='💹',
                   layout="wide")

# Title of the app
st.title(':red[Social] Media :red[Analytics]')

# Option menu for navigation
with st.sidebar:
    options = option_menu(
        menu_title="Main Menu",  # You can customize the title here
        options=["Dashboard", "Platform Specific", "Gen AI", "Sentiment Analysis"],
        icons=["exclude", "slack", "chat-quote", "emoji-smile"],
        menu_icon="cast",
        default_index=0,  # Set Platform Specific as default for this example
        orientation="vertical",
    )


@st.cache_data
def load_data():
    with open("data-sources/Enriched_Social_Media_Mentions.json") as file:
        data = json.load(file)
    return data


@st.cache_data
def get_unique_platforms(data):
    platforms = set()
    for entity in data.values():
        for mentions in entity['mentions'].values():
            for mention in mentions:
                platforms.add(mention['platform'])
    return sorted(platforms)


def filter_mentions(data, target, month):
    filtered_mentions = []
    for t in target:
        if t in data and month in data[t]['mentions']:
            filtered_mentions.extend(data[t]['mentions'][month])
    return filtered_mentions


def analyze_sentiment(text):
    analysis = TextBlob(text)
    if analysis.sentiment.polarity > 0:
        return 'Positive'
    elif analysis.sentiment.polarity < 0:
        return 'Negative'
    else:
        return 'Neutral'


def perform_sentiment_analysis(mentions):
    sentiments = {'Positive': 0, 'Negative': 0, 'Neutral': 0}
    for mention in mentions:
        sentiment = analyze_sentiment(mention['mention'])
        sentiments[sentiment] += 1
    return sentiments


if options == "Dashboard":
    # Load the data
    data = load_data()
    # Select target company
    target_company = st.selectbox("Select Target Company", list(data.keys()))

    # Define the months to compare
    month_1_key = "month_1"
    month_2_key = "month_2"

    # Count mentions by platform for a given month
    def count_mentions(data, target_company, month_key):
        mentions_count = {}
        if target_company in data and month_key in data[target_company]['mentions']:
            for mention in data[target_company]['mentions'][month_key]:
                platform = mention['platform']
                if platform in mentions_count:
                    mentions_count[platform] += 1
                else:
                    mentions_count[platform] = 1
        return mentions_count

    # Count mentions for both months
    mentions_month_1 = count_mentions(data, target_company, month_1_key)
    mentions_month_2 = count_mentions(data, target_company, month_2_key)

    style_metric_cards(
    background_color="#00000000",  # Set the desired background color
    border_radius_px=10,  # Set border radius
    border_left_color="deepskyblue" ,
    border_color="deepskyblue"  # Set the border color
    )

    # Display metrics with comparison
    if mentions_month_1 and mentions_month_2:
        platforms = set(mentions_month_1.keys()).union(set(mentions_month_2.keys()))
        # Use st.columns to display multiple metrics in a row
        cols = st.columns(len(platforms))
        for i, platform in enumerate(platforms):
            current_value = mentions_month_2.get(platform, 0)
            previous_value = mentions_month_1.get(platform, 0)
            difference = current_value - previous_value

            # Display metric in the appropriate column
            with cols[i]:
                st.metric(label=f"{platform}", value=current_value, delta=difference)
    else:
        st.warning("No data available for the selected company in the specified months.")

    graph_col, genai_col = st.columns([4, 2])
    with graph_col:
        st.header("Data View")
        # Input for target entity
        target_col, month_col = st.columns(2)
        with target_col:
            target = st.multiselect("Select The Target Topic", ['Mr Price', 'UKZN Government'], "Mr Price")

    # Mapping month names to keys
        month_mapping = {
        "August 2024": "month_1",
        "July 2024": "month_2"
        }
        with month_col:
            # Select the month by actual name
            month_name = st.selectbox("Select the month", list(month_mapping.keys()))

        if target and month_name:
            # Get the corresponding month key from the mapping
            month = month_mapping[month_name]

            # Filter the mentions based on the input
            mentions = filter_mentions(data, target, month)

        if mentions:
            st.subheader(f"Mentions of {', '.join(target)} for {month_name}:")
            # Convert mentions to DataFrame
            df = pd.DataFrame(mentions)
            st.dataframe(df, use_container_width=True)
        else:
            st.warning(f"No data found for {', '.join(target)} in {month_name}")
    with genai_col:
        st.header("Gen AI")
        st.write("")
        st.write("")
        # Initialize chat history
        if "messages" not in st.session_state:
            st.session_state.messages = []

        # Display chat messages from history on app rerun
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

        # Accept user input in the chat interface
        if prompt := st.chat_input("What would you like to know?"):
            # Add user message to chat history
            st.session_state.messages.append({"role": "user", "content": prompt})
            # Display user message in chat message container
            with st.chat_message("user"):
                st.markdown(prompt)

            # Generate assistant response
            response = respond(prompt, f"You are a helpful assitant who answers questions about this dataset {data}")

            # Display assistant response in chat message container
            with st.chat_message("assistant"):
                st.markdown(response)

            # Add assistant response to chat history
            st.session_state.messages.append({"role": "assistant", "content": response})
elif options == "Platform Specific":

    # Load the data
    @st.cache_data
    def load_data():
        with open("data-sources/Final_Social_Media_Mentions.json") as file:
            data = json.load(file)
        return data

    # Get unique platforms from data
    @st.cache_data
    def get_unique_platforms(data):
        platforms = set()
        for entity in data.values():
            for mentions in entity['mentions'].values():
                for mention in mentions:
                    platforms.add(mention['platform'])
        return sorted(platforms)

    # Filter mentions by platform and calculate trends
    def get_trend_data(mentions, period):
        df = pd.DataFrame(mentions)
        df['date'] = pd.to_datetime(df['date'])

        if period == 'Yearly':
            df = df.resample('Y', on='date').size()
        elif period == 'Monthly':
            df = df.resample('M', on='date').size()
        elif period == 'Weekly':
            df = df.resample('W', on='date').size()
        else:  # Daily
            df = df.resample('D', on='date').size()

        return df

    # Create the pie chart data
    def get_content_type_distribution(mentions):
        df = pd.DataFrame(mentions)
        content_type_counts = df['content_type'].value_counts()
        return content_type_counts

    # Initialize session state for the selected platform
    if "selected_platform" not in st.session_state:
        st.session_state.selected_platform = None
    # Load the data
    data = load_data()

    # Get unique platforms
    unique_platforms = get_unique_platforms(data)
    unique_platforms.insert(0,'All')
    # Create a grid of buttons for each platform
    platform_buttons = grid(len(unique_platforms))
    for i, platform in enumerate(unique_platforms):
        if platform_buttons.button(platform, use_container_width=True):
            # When a platform button is clicked, store it in session state
            st.session_state.selected_platform = platform
    company_col, time_col = st.columns(2)
    with company_col:
        company_choice = st.selectbox("Choose the company", ["Mr Price", "UKZN Government"])
    # Select the time period for the trend analysis
    with time_col:
        time_period = st.selectbox("Select Time Period", ["Yearly", "Monthly", "Weekly", "Daily"])
    if st.session_state.selected_platform:
        selected_platform = st.session_state.selected_platform

        # Filter mentions for the selected platform and company
        mentions = []
        # Filter mentions for the selected platform and company
        mentions = []
        if company_choice in data:  # Check if the selected company exists in the data
            for month_mentions in data[company_choice]['mentions'].values():
                mentions.extend([mention for mention in month_mentions if mention['platform'] == selected_platform])

        if mentions:
            # Calculate the trend data
            trend_data = get_trend_data(mentions, time_period)

            # Calculate content type distribution
            content_type_distribution = get_content_type_distribution(mentions)

            # Create two columns for side-by-side charts
            col1, col2 = st.columns(2)
            named_months = {
                "01": 'Jan',
                "02": 'Feb',
                "03": 'Mar',
                "04": 'Apr',
                "05": 'May',
                "06": 'Jun',
                "07": 'Jul',
                "08": 'Aug',
                "09": 'Sep',
                "10": 'Oct',
                "11": 'Nov',
                "12": 'Dec',
            }

            # Display trend chart
            with col1:
                trend_chart_data = {
                    "chart": {
                        "type": "spline",
                        "plotBackgroundColor": None,
                        "plotBorderWidth": None,
                        "plotShadow": False,
                        "backgroundColor": 'rgba(0, 0, 0, 0)',  # Transparent background
                    },
                    "title": {
                        "text": f"{selected_platform} Mentions Trend for {company_choice} ({time_period})",
                        "style": {
                            "color": "white",  # Title text color
                            "fontWeight": "bold"
                        }
                    },
                    "xAxis": {
                        "categories": [named_months[x[5:7]] for x in trend_data.index.strftime('%Y-%m-%d').tolist()],
                        "labels": {
                            "style": {
                                "color": "white"  # X-axis labels text color
                            }
                        },
                        "lineColor": "white",  # X-axis line color
                        "tickColor": "white"  # X-axis tick color
                    },
                    "yAxis": {
                        "title": {
                            "text": "Number of Mentions",
                            "style": {
                                "color": "white"  # Y-axis title text color
                            }
                        },
                        "labels": {
                            "style": {
                                "color": "white"  # Y-axis labels text color
                            }
                        },
                        "gridLineColor": "rgba(255, 255, 255, 0.2)",  # Y-axis grid line color
                        "lineColor": "blue",  # Y-axis line color
                        "tickColor": "blue"  # Y-axis tick color
                    },
                    "legend": {
                        "itemStyle": {
                            "color": "white"  # Legend text color
                        },
                        "itemHoverStyle": {
                            "color": "lightgray"  # Legend text color on hover
                        }
                    },
                    "series": [{
                        "name": "Mentions",
                        "data": trend_data.tolist(),
                        "color": "blue",  # Line color
                        "dataLabels": {
                            "enabled": False,  # Disable data labels
                            "style": {
                                "color": "transparent"  # If labels are still there, make them invisible
                                }
                            }
                        }],
                    "tooltip": {
                        "backgroundColor": "rgba(0, 0, 0, 0.85)",  # Tooltip background color
                        "style": {
                            "color": "white"  # Tooltip text color
                        }
                    }
                }
                stc.streamlit_highcharts(trend_chart_data)
            # Display content type pie chart
            with col2:
                pie_chart_data = {
                    "chart": {
                        "plotBackgroundColor": None,
                        "plotBorderWidth": None,
                        "plotShadow": False,
                        "textColor": "white",
                        'backgroundColor': 'rgba(0, 0, 0, 0)',  # Transparent background
                        "type": "pie"
                    },
                    "plotOptions": {
                        "pie": {
                            "allowPointSelect": True,
                            "cursor": 'pointer',
                            "dataLabels": {
                                "enabled": True,
                                "format": '<span style="font-size: 1.2em"><b>{point.name}</b>' +
                                        '</span><br>' +
                                        '<span style="opacity: 0.6">{point.percentage:.1f} ' +
                                        '%</span>',
                                "connectorColor": 'rgba(128,128,128,0.5)'
                            }
                        }
                    },
                    "title": {
                        "style": {
                            "color": "white",
                            "fontWeight": "bold"
                        },
                        "text": f"{selected_platform} Content Type Distribution for {company_choice}"
                    },
                    "series": [{
                        "name": "Content Types",
                        "data": [{"name": ct, "y": count} for ct, count in content_type_distribution.items()]
                    }]
                }
                stc.streamlit_highcharts(pie_chart_data)
        else:
            st.warning(f"No mentions found for {selected_platform} on {company_choice}.")
    else:
        st.info("Please select a platform to begin.")

    # Extract mentions based on the selected company and platform
    mentions = []
    selected_platform = st.session_state.selected_platform
    if company_choice == "Mr Price":
        company_data = data.get("Mr Price", {})
    else:
        company_data = data.get("UKZN Government", {})

    for month, month_data in company_data.get('mentions', {}).items():
        for mention in month_data:
            # Filter mentions by the selected platform
            if mention['platform'] == selected_platform:
                mentions.append(mention['mention'])

    # Combine all mentions into a single text
    combined_text = ' '.join(mentions)

    # Clean and split the text into words
    words = re.sub(r'[():"\[\]\'?0-9.,]+', '', combined_text).split()

    # Count occurrences of each word
    word_count = Counter(words)

    # Convert to the format required by Highcharts
    word_data = [{"name": word, "weight": count} for word, count in word_count.items()]

    # Generate the Highcharts code
    highchart_code = f"""
    <figure class="highcharts-figure">
        <div id="container"></div>
    </figure>

    <script src="https://code.highcharts.com/highcharts.js"></script>
    <script src="https://code.highcharts.com/modules/wordcloud.js"></script>

    <script>
    Highcharts.chart('container', {{
        accessibility: {{
            screenReaderSection: {{
                beforeChartFormat: '<h5>{{chartTitle}}</h5>' +
                    '<div>{{chartSubtitle}}</div>' +
                    '<div>{{chartLongdesc}}</div>' +
                    '<div>{{viewTableButton}}</div>'
            }}
        }},
        chart:{{
            borderRadius: 15
        }},
        series: [{{
            type: 'wordcloud',
            data: {json.dumps(word_data)},
            name: 'Occurrences',
            rotation: {{
                from: 0,
                to: 0
            }},
            minFontSize: 20,
            maxFontSize: 80,
        }}],
        title: {{
            text: 'Wordcloud of Social Media Mentions for {company_choice} on {selected_platform}',
            align: 'center'
        }},
        tooltip: {{
            headerFormat: '<span style="font-size: 16px"><b>{{point.key}}</b>' +
                '</span><br>'
        }}
    }});
    </script>
    """

    components.html(highchart_code, height=600)

elif options == "Gen AI":
    @st.cache_data
    def load_data():
        with open("data-sources/Enriched_Social_Media_Mentions.json") as file:
            data = json.load(file)
        return data
    data = load_data()
    # Initialize chat history
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Display chat messages from history on app rerun
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Accept user input
    if prompt := st.chat_input("What is up?"):
        # Add user message to chat history
        st.session_state.messages.append({"role": "user", "content": prompt})
        # Display user message in chat message container
        with st.chat_message("user"):
            st.markdown(prompt)

        # Generate assistant response
        response = respond(prompt, f"Reply as an assistant getting your insights from the {data}")
        # Display assistant response in chat message container
        with st.chat_message("assistant"):
            st.markdown(response)
        # Add assistant response to chat history
        st.session_state.messages.append({"role": "assistant", "content": response})
elif options == "Sentiment Analysis":
    data = load_data()
    target_col,month_col,chart_col = st.columns(3)
    # Multiselect for target entity
    with target_col:
        targets = st.multiselect("Select The Target Topics", list(data.keys()))

    # Mapping month names to keys
    month_mapping = {
        "June 2024": "month_1",
        "May 2024": "month_2"
    }
    with month_col:
        # Select the month by actual name
        month_name = st.selectbox("Select the month", list(month_mapping.keys()))
    with chart_col:
        # Select the chart type
        chart_type = st.selectbox("Select Chart Type", ["column", "bar", "radar"])

    if targets and month_name:
        # Get the corresponding month key from the mapping
        month = month_mapping[month_name]

        # Initialize an empty list to hold the series data for each target
        series_data = []

        for target in targets:
            # Filter the mentions based on the input
            mentions = data.get(target, {}).get('mentions', {}).get(month, [])

            if mentions:
                # Perform sentiment analysis
                sentiments = perform_sentiment_analysis(mentions)

                # Add the sentiment data for the current target to the series data
                if chart_type == "doughnut":
                    series_data.append({
                        "name": target,
                        "data": [
                            {"name": "Positive", "y": sentiments['Positive']},
                            {"name": "Negative", "y": sentiments['Negative']},
                            {"name": "Neutral", "y": sentiments['Neutral']}
                        ]
                    })
                else:
                    series_data.append({
                        "name": target,
                        "data": [sentiments['Positive'], sentiments['Negative'], sentiments['Neutral']]
                    })

        # Prepare chart data for the combined plot
        if series_data:
            chart_data = {
                "chart": {"type": chart_type if chart_type != "radar" else "line", "polar": True if chart_type == "radar" else False},  # Dynamic chart type
                "title": {"text": f"Sentiment Analysis for {', '.join(targets)} in {month_name}"},
                "xAxis": {"categories": ["Positive", "Negative", "Neutral"] if chart_type != "doughnut" else None, "tickmarkPlacement": "on" if chart_type == "radar" else None},
                "yAxis": {"title": {"text": ""}, "min": 0 if chart_type == "radar" else None},
                "legend": {"enabled": True},  # Enable the legend
                "series": series_data
            }

            # Display the combined chart
            stc.streamlit_highcharts(chart_data, height=600)

        else:
            st.warning(f"No data found for the selected topics in {month_name}")
