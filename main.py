import sys
sys.path.append(r'C:\Users\admin\AppData\Local\Programs\Python\Python312\Lib\site-packages')

import streamlit as st

# Set page config at the very beginning
st.set_page_config(page_title='Social Media Analytics', page_icon='💹', layout="wide")

# All other imports
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import json
import streamlit.components.v1 as components
import pandas as pd
from textblob import TextBlob
import streamlit_highcharts as stc
from streamlit_option_menu import option_menu
import numpy as np
import os
from streamlit_extras.grid import grid
import google.generativeai as genai
from dotenv import load_dotenv
from streamlit_extras.metric_cards import style_metric_cards
import re
from collections import Counter
import calendar
import time
from datetime import datetime, timedelta


import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import random


import google.cloud.translate_v2 as translate
from google.oauth2 import service_account


import google.cloud.translate_v2 as translate
from google.oauth2 import service_account



import base64
from io import BytesIO
import plotly.io as pio

import uuid
import re


import streamlit as st
import pandas as pd
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import threading
import time
from datetime import datetime, timedelta



def export_csv(data, filename="social_media_data.csv", button_text="Download CSV File"):
    """
    Creates a download button for a pandas DataFrame as a CSV file.
    """
    csv = data.to_csv(index=False)
    return create_download_button(csv, filename, button_text)

def export_chart_as_png(fig, filename="chart.png", button_text="Download Chart as PNG"):
    """
    Creates a download button for a plotly figure as a PNG image.
    If kaleido is not installed, provides a message to install it.
    """
    try:
        img = pio.to_image(fig, format="png")
        return create_download_button(img, filename, button_text)
    except ValueError as e:
        if "kaleido" in str(e):
            return "To enable chart downloads, please install the kaleido package: `pip install -U kaleido`"
        else:
            raise e





load_dotenv()
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



# Title of the app
st.title(':red[Social] Media :red[Analytics]')

# Option menu for navigation
with st.sidebar:
    options = option_menu(
    menu_title="Main Menu",
    options=["Dashboard", "Platform Specific", "Gen AI", "Sentiment Analysis", "World View", "Live Updates", "Report"],
    icons=["exclude", "slack", "chat-quote", "emoji-smile", 'globe', 'graph-up', 'file-earmark-text'],
    menu_icon="cast",
    default_index=0,
    orientation="vertical",

    )

@st.cache_data
def load_data():
    with open("data-sources/Mentions-Data.json") as file:
        data = json.load(file)
    return data

@st.cache_data
def get_unique_platforms(data):
    platforms = set()
    for entity in data.values():
        for mention in entity['mentions']:
            platforms.add(mention['platform'])
    return sorted(platforms)

def filter_mentions(data, target, month):
    filtered_mentions = []
    if target in data:
        filtered_mentions.extend([mention for mention in data[target]['mentions'] if month in mention['date']])
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

    # Extract all months available in the data
    all_dates = sorted(
        {mention['date'][:7] for company in data.values() for mention in company['mentions']}
    )

    # Create a mapping of months to their human-readable names
    month_name_mapping = {
        date: f"{calendar.month_name[int(date[5:7])]} {date[:4]}" for date in all_dates
    }

    # Reverse mapping to get back to the original format
    name_to_date_mapping = {v: k for k, v in month_name_mapping.items()}

    # Input for target entity
    target_col, month_col = st.columns(2)
    with target_col:
        target = st.multiselect("Select The Target Topic", ['Mr Price', 'KZN Government', 'Edgars'], ["Mr Price"])

    with month_col:
        # Select the month by actual name
        month_name_display = st.selectbox("Select the month", list(month_name_mapping.values()))

    # Get the selected month in original format
    month_name = name_to_date_mapping[month_name_display]

    # Create a mapping of months to their previous month
    previous_month = None
    for idx, date in enumerate(all_dates):
        if date == month_name and idx > 0:
            previous_month = all_dates[idx - 1]
            break

    # Count mentions by platform for a given month across all selected targets
    def count_mentions(data, targets, month_key):
        mentions_count = {}
        for target_company in targets:
            if target_company in data:
                for mention in data[target_company]['mentions']:
                    if month_key and month_key in mention['date']:  # Check if month_key is not None
                        platform = mention['platform']
                        if platform in mentions_count:
                            mentions_count[platform] += 1
                        else:
                            mentions_count[platform] = 1
        return mentions_count

    # Ensure we're passing all selected companies
    if target:
        # Count mentions for the selected and previous months across all targets
        mentions_current_month = count_mentions(data, target, month_name)
        mentions_previous_month = count_mentions(data, target, previous_month) if previous_month else {}

        style_metric_cards(
            background_color="#00000000",  # Set the desired background color
            border_radius_px=10,  # Set border radius
            border_left_color="deepskyblue",
            border_color="deepskyblue"  # Set the border color
        )

        # Display metrics with comparison
        if mentions_current_month:
            platforms = set(mentions_current_month.keys()).union(set(mentions_previous_month.keys()))
            # Use st.columns to display multiple metrics in a row
            cols = st.columns(len(platforms))
            for i, platform in enumerate(platforms):
                current_value = mentions_current_month.get(platform, 0)
                previous_value = mentions_previous_month.get(platform, 0) if previous_month else 0
                difference = current_value - previous_value

                # Display metric in the appropriate column
                with cols[i]:
                    st.metric(label=f"{platform}", value=current_value, delta=difference)
        else:
            st.warning("No data available for the selected company in the specified months.")

        graph_col, genai_col = st.columns([4, 2])
        with graph_col:
            st.header("Data View")
            if target and month_name:
                all_mentions = []
                # Filter the mentions based on the input
                for selected_target in target:
                    mentions = filter_mentions(data, selected_target, month_name)
                    all_mentions.extend(mentions)

                if all_mentions:
                    # Convert mentions to DataFrame
                    df = pd.DataFrame(all_mentions)
                    st.dataframe(df, use_container_width=True)
                else:
                    st.warning(f"No data found for {', '.join(target)} in {month_name_display}")
        with genai_col:
            st.header("Gen AI")
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
                response = respond(prompt, f"You are a helpful assistant who answers questions about this dataset {data}")

                # Display assistant response in chat message container
                with st.chat_message("assistant"):
                    st.markdown(response)

                # Add assistant response to chat history
                st.session_state.messages.append({"role": "assistant", "content": response})

elif options == "Platform Specific":
    @st.cache_data
    def load_data():
        with open("data-sources/Mentions-Data.json") as file:
            data = json.load(file)
        return data

    @st.cache_data
    def get_platform_groups():
        return {
            "Meta": ["Facebook", "Instagram"],
            "Google": ["YouTube", "Google Analytics", "Google News"],
            "News": ["eNCA News", "SABC News"],
            "X (Twitter)": ["X (Twitter)"],
            "Reddit": ["Reddit"],
            "Telegram": ["Telegram"],
            "LinkedIn": ["LinkedIn"]
        }

    def filter_mentions(data, company_choice, platform_group, sub_platform):
        mentions = []
        if company_choice in data:
            for mention in data[company_choice]['mentions']:
                if platform_group == "Meta" and mention['platform'] in ["Facebook", "Instagram"]:
                    if not sub_platform or mention['platform'] == sub_platform:
                        mentions.append(mention)
                elif platform_group == "Google" and mention['platform'] in ["YouTube", "Google Analytics", "Google News"]:
                    if not sub_platform or mention['platform'] == sub_platform:
                        mentions.append(mention)
                elif platform_group == "News" and mention['platform'] in ["eNCA News", "SABC News"]:
                    if not sub_platform or mention['platform'] == sub_platform:
                        mentions.append(mention)
                elif mention['platform'] == platform_group:
                    mentions.append(mention)
        return mentions

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

    def get_content_type_distribution(mentions):
        df = pd.DataFrame(mentions)
        content_type_counts = df['content_type'].value_counts()
        return content_type_counts

    def safe_jsonify(obj):
        if isinstance(obj, pd.Series):
            return obj.to_list()
        if isinstance(obj, pd.DataFrame):
            return obj.to_dict(orient="records")
        if isinstance(obj, np.int64) or isinstance(obj, np.float64):
            return obj.item()
        return obj

    # Initialize session state for the selected platform and group
    if "selected_platform_group" not in st.session_state:
        st.session_state.selected_platform_group = None
    if "selected_platform" not in st.session_state:
        st.session_state.selected_platform = None

    # Load the data
    data = load_data()
    platform_groups = get_platform_groups()

    # Create a grid of buttons for each platform group
    platform_group_buttons = grid(len(platform_groups))
    for i, group in enumerate(platform_groups.keys()):
        if platform_group_buttons.button(group, use_container_width=True):
            # When a platform group button is clicked, store it in session state
            st.session_state.selected_platform_group = group
            st.session_state.selected_platform = None  # Reset the specific platform when group changes

    # If a platform group is selected, show specific platform options
    if st.session_state.selected_platform_group:
        group = st.session_state.selected_platform_group
        if group not in ["X (Twitter)", "Reddit", "Telegram", "LinkedIn"]:
            specific_platforms = ["All"] + platform_groups[group]
            st.session_state.selected_platform = st.selectbox(f"Select a specific platform in {group}", specific_platforms)


    company_col, time_col = st.columns(2)
    with company_col:
        company_choice = st.selectbox("Choose the company", ["Mr Price", "KZN Government", "Edgars"])
    # Select the time period for the trend analysis
    with time_col:
        time_period = st.selectbox("Select Time Period", ["Yearly", "Monthly", "Weekly", "Daily"])

    if st.session_state.selected_platform_group:
        if st.session_state.selected_platform == "All":
            series_data = []
            drilldown_series = []
            platform_trend_data = []
            for platform in platform_groups[st.session_state.selected_platform_group]:
                mentions = filter_mentions(data, company_choice, st.session_state.selected_platform_group, platform)
                content_type_distribution = get_content_type_distribution(mentions)
                platform_total = safe_jsonify(content_type_distribution.sum())
                series_data.append({
                    "name": platform,
                    "y": platform_total,
                    "drilldown": platform
                })
                drilldown_series.append({
                    "name": platform,
                    "id": platform,
                    "data": [[ct, safe_jsonify(count)] for ct, count in content_type_distribution.items()]
                })

                # Get trend data for this platform
                trend_data = get_trend_data(mentions, time_period)
                if not trend_data.empty:
                    platform_trend_data.append({
                        "name": platform,
                        "data": safe_jsonify(trend_data.tolist()),
                    })

            if series_data:
                col1, col2 = st.columns(2)

                # Display the spline chart for all platforms
                with col1:
                    x_labels = trend_data.index.strftime('%Y-%m-%d').tolist() if trend_data.index is not None else []
                    trend_chart_data = {
                        "chart": {
                            "type": "spline",
                            "plotBackgroundColor": None,
                            "plotBorderWidth": None,
                            "plotShadow": False,
                            "backgroundColor": 'rgba(0, 0, 0, 0)',  # Transparent background
                        },
                        "title": {
                            "text": f"{st.session_state.selected_platform_group} Platforms Trend for {company_choice} ({time_period})",
                            "style": {
                                "color": "white",  # Title text color
                                "fontWeight": "bold"
                            }
                        },
                        "xAxis": {
                            "categories": x_labels,
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
                            "lineColor": "white",  # Y-axis line color
                            "tickColor": "white"  # Y-axis tick color
                        },
                        "legend": {
                            "itemStyle": {
                                "color": "white"  # Legend text color
                            },
                            "itemHoverStyle": {
                                "color": "lightgray"  # Legend text color on hover
                            }
                        },
                        "series": platform_trend_data,
                        "tooltip": {
                            "backgroundColor": "rgba(0, 0, 0, 0.85)",  # Tooltip background color
                            "style": {
                                "color": "white"  # Tooltip text color
                            }
                        }
                    }
                    stc.streamlit_highcharts(trend_chart_data)

                # Display the pie chart with drilldown
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
                        "title": {
                            "style": {
                                "color": "white",  # Title text color
                                "fontWeight": "bold"
                            },
                            "text": f"{st.session_state.selected_platform_group} Platforms Content Type Distribution"
                        },
                        "subtitle": {
                            "style": {
                                "color": "white",  # Subtitle text color
                                "fontWeight": "bold"
                            },
                            "text": 'Click the slices to view content type distribution.'
                        },
                        "plotOptions": {
                            "series": {
                                "dataLabels": {
                                    "enabled": True,
                                    "format": '{point.name}: {point.y}',
                                    "style": {
                                        "color": "white",  # Data labels text color
                                        "textOutline": "none"  # This line removes the underline effect.
                                    }
                                }
                            }
                        },
                        "tooltip": {
                            "headerFormat": '<span style="font-size:11px; color:white">{series.name}</span><br>',  # Tooltip header text color
                            "pointFormat": '<span style="color:{point.color}">{point.name}</span>: <b style="color:white">{point.y}</b><br/>'  # Tooltip point text color
                        },
                        "series": [{
                            "name": "Platforms",
                            "colorByPoint": True,
                            "data": series_data,
                            "dataLabels": {
                                    "style": {
                                        "color": "white"  # Platform names text color
                                    }
                                }
                        }],
                        "drilldown": {
                            "series": [{
                                "name": "Platforms",
                                "colorByPoint": True,
                                "dataLabels": {
                                    "style": {
                                        "color": "white"  # Drilldown labels text color
                                    }
                                }
                            }] + drilldown_series  # Ensuring drilldown text is also white
                        }
                    }
                    stc.streamlit_highcharts(safe_jsonify(pie_chart_data))

        else:
            # Filter mentions for the selected platform group and company
            sub_platform = None if st.session_state.selected_platform == "All" else st.session_state.selected_platform
            mentions = filter_mentions(data, company_choice, st.session_state.selected_platform_group, sub_platform)
            trend_data = get_trend_data(mentions, time_period)

            if not trend_data.empty:
                # Adjust x-axis labels based on the selected time period
                if time_period == 'Yearly':
                    x_labels = trend_data.index.strftime('%Y').tolist()
                elif time_period == 'Monthly':
                    x_labels = trend_data.index.strftime('%Y-%m').tolist()
                elif time_period == 'Weekly':
                    x_labels = trend_data.index.strftime('Week %U, %Y').tolist()
                else:  # Daily
                    x_labels = trend_data.index.strftime('%Y-%m-%d').tolist()

                # Calculate content type distribution
                content_type_distribution = get_content_type_distribution(mentions)

                # Create two columns for side-by-side charts
                col1, col2 = st.columns(2)

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
                            "text": f"{st.session_state.selected_platform} Mentions Trend for {company_choice} ({time_period})",
                            "style": {
                                "color": "white",  # Title text color
                                "fontWeight": "bold"
                            }
                        },
                        "xAxis": {
                            "categories": x_labels,
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
                            "lineColor": "white",  # Y-axis line color
                            "tickColor": "white"  # Y-axis tick color
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
                            "data": safe_jsonify(trend_data.tolist()),
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
                            "text": f"{st.session_state.selected_platform} Content Type Distribution for {company_choice}"
                        },
                        "series": [{
                            "name": "Content Types",
                            "data": [{"name": ct, "y": safe_jsonify(count)} for ct, count in content_type_distribution.items()]
                        }]
                    }
                    stc.streamlit_highcharts(pie_chart_data)
            else:
                st.warning(f"No data available for the selected parameters.")

elif options == "Gen AI":
    @st.cache_data
    def load_data():
        with open("data-sources/Mentions-Data.json") as file:
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
    target_col, month_col, chart_col = st.columns(3)
    # Multiselect for target entity
    with target_col:
        targets = st.multiselect("Select The Target Topics", list(data.keys()))

    # Mapping month names to keys
    month_mapping = {
        "August 2024": "2024-08",
        "July 2024": "2024-07"
    }
    with month_col:
        # Select the month by actual name
        month_name = st.selectbox("Select the month", list(month_mapping.keys()))
    with chart_col:
        # Select the chart type
        chart_type = st.selectbox("Select Chart Type", ["sankey", "bar", "radar", 'word-cloud'])

    if targets and month_name:
        # Get the corresponding month key from the mapping
        month = month_mapping[month_name]

        if chart_type == "sankey":
            # Initialize data for Sankey chart
            sankey_data = []

            sentiment_colors = {
                "Positive": "#0000FF",  # Blue for Positive
                "Negative": "#FF0000",  # Red for Negative
                "Neutral": "#FFBF00"    # Amber for Neutral
            }

            for target in targets:
                mentions = data.get(target, {}).get('mentions', [])
                if mentions:
                    # Filter mentions by the selected month
                    month_mentions = [mention for mention in mentions if month in mention['date']]
                    if month_mentions:
                        # Perform sentiment analysis
                        sentiments = perform_sentiment_analysis(month_mentions)

                        # Get platforms from mentions
                        platforms = set(mention['platform'] for mention in month_mentions)

                        for platform in platforms:
                            platform_mentions = [mention for mention in month_mentions if mention['platform'] == platform]
                            platform_sentiments = perform_sentiment_analysis(platform_mentions)

                            for sentiment, count in platform_sentiments.items():
                                sankey_data.append({
                                    "from": platform,  # Platform name as the source
                                    "to": sentiment,   # Sentiment as the destination
                                    "weight": count,
                                    "color": sentiment_colors[sentiment]  # Assign color based on sentiment
                                })

            if sankey_data:
                sankey_chart_data = {
                    "chart": {"type": "sankey"},
                    "title": {"text": f"Sankey Chart of Sentiment Analysis for {', '.join(targets)} in {month_name}"},
                    "series": [{
                        "keys": ["from", "to", "weight", "color"],
                        "data": [[item["from"], item["to"], item["weight"], item["color"]] for item in sankey_data],
                        "type": "sankey",
                        "name": "Sentiment Flow",
                        "link": {
                            "colorByPoint": True  # Use the color specified for each flow
                        },
                        "nodes": [{
                            "id": sentiment,
                            "color": sentiment_colors[sentiment]
                        } for sentiment in sentiment_colors.keys()]  # Color blocks for sentiments
                    }]
                }
                # Display the Sankey chart
                stc.streamlit_highcharts(sankey_chart_data, height=600)
            else:
                st.warning(f"No data found for the selected topics in {month_name}")
        elif chart_type == "word-cloud":
            # Basic sentiment analysis function using TextBlob
            def get_sentiment(text):
                sid = SentimentIntensityAnalyzer()
                scores = sid.polarity_scores(text)
                if scores['compound'] >= 0.05:
                    return "Positive"
                elif scores['compound'] <= -0.05:
                    return "Negative"
                else:
                    return "Neutral"
            all_words = {'Positive': [], 'Negative': []}

            for target in targets:
                mentions = data.get(target, {}).get('mentions', [])
                if mentions:
                    # Filter mentions by the selected month
                    month_mentions = [mention for mention in mentions if month in mention['date']]
                if month_mentions:
                    # Perform sentiment analysis
                    for mention in month_mentions:
                        sentiment = get_sentiment(mention['mention'])  # Assuming 'mention' field contains text
                        words = mention['mention'].split()
                        if sentiment == "Positive":
                            all_words['Positive'].extend(words)
                        elif sentiment == "Negative":
                            all_words['Negative'].extend(words)
            # Prepare data for the word cloud
            wordcloud_data = [
                        {"name": word, "weight": 1, "color": "blue"} for word in all_words['Positive']
                        ] + [
                            {"name": word, "weight": 1, "color": "red"} for word in all_words['Negative']
                            ]
            if wordcloud_data:
                # Generate the Highcharts word cloud configuration
                wordcloud_chart_data = f"""
                    <script src="https://code.highcharts.com/highcharts.js"></script>
                    <script src="https://code.highcharts.com/modules/wordcloud.js"></script>
                    <div id="container"></div>
                    <script>
                    Highcharts.chart('container', {{
                        chart: {{
                            type: 'wordcloud',
                            borderRadius: 15}},
                        title: {{ text: 'Sentiment Analysis Word Cloud' }},
                        series: [{{
                            type: 'wordcloud',
                            data: {wordcloud_data},
                            name: 'Occurrences'
                        }}]
                    }});
                    </script>
                    """
                    # Display the word cloud using streamlit.components.v1
                components.html(wordcloud_chart_data, height=650)
            else:
                    st.warning(f"No data found for the selected topics in {month_name}")

        else:
            # Existing logic for other chart types
            series_data = []
            for target in targets:
                mentions = data.get(target, {}).get('mentions', [])
                if mentions:
                    month_mentions = [mention for mention in mentions if month in mention['date']]
                    sentiments = perform_sentiment_analysis(month_mentions)
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

            if series_data:
                chart_data = {
                    "chart": {"type": chart_type if chart_type != "radar" else "line", "polar": True if chart_type == "radar" else False},
                    "title": {"text": f"Sentiment Analysis for {', '.join(targets)} in {month_name}"},
                    "xAxis": {"categories": ["Positive", "Negative", "Neutral"] if chart_type != "doughnut" else None, "tickmarkPlacement": "on" if chart_type == "radar" else None},
                    "yAxis": {"title": {"text": ""}, "min": 0 if chart_type == "radar" else None},
                    "legend": {"enabled": True},
                    "series": series_data
                }

                # Display the combined chart
                stc.streamlit_highcharts(chart_data, height=600)

            else:
                st.warning(f"No data found for the selected topics in {month_name}")
elif options == "World View":
    # Load the JSON data
    with open("data-sources/Mentions-Data.json", "r") as file:
        data = json.load(file)

    # Select target (Mr Price or KZN Government)
    target = st.selectbox("Select Target", list(data.keys()))

    # Extract the mentions and their corresponding locations
    mentions_data = data[target]["mentions"]
    # Initialize a dictionary to count mentions per location
    location_counts = {}

    # Example mapping of location names to their corresponding hc-keys
    # Updated mapping of location names to their corresponding hc-keys
    location_to_hckey = {
        "Western Cape": "za-wc",
        "Eastern Cape": "za-ec",
        "Northern Cape": "za-nc",
        "North West": "za-nw",
        "Gauteng": "za-gt",
        "Mpumalanga": "za-mp",
        "Limpopo": "za-lp",
        "KwaZulu-Natal": "za-kzn",
        "Free State": "za-fs",
        "Nelspruit": "za-mp",  # Nelspruit is in Mpumalanga
        "Durban": "za-kzn",  # Durban is in KwaZulu-Natal
        "Port Elizabeth": "za-ec",  # Port Elizabeth is in Eastern Cape
        "Kimberley": "za-nc",  # Kimberley is in Northern Cape
        "Bloemfontein": "za-fs",  # Bloemfontein is in Free State
        "Pretoria": "za-gt",  # Pretoria is in Gauteng
        "Johannesburg": "za-gt",  # Johannesburg is in Gauteng
        "Cape Town": "za-wc",  # Cape Town is in Western Cape
        "East London": "za-ec",  # East London is in Eastern Cape
        "Polokwane": "za-lp"  # Polokwane is in Limpopo
    }

    # Count the mentions for each location
    for mention in mentions_data:
        location = mention["location"]
        # Map the location to its hc-key
        hc_key = location_to_hckey.get(location)
        if hc_key:
            if hc_key in location_counts:
                location_counts[hc_key] += 1
            else:
                location_counts[hc_key] = 1

    # Prepare data for Highcharts with proper hc-keys
    mapped_data = [{"hc-key": location, "value": count}
                   for location, count in location_counts.items()]

    # Define the Highcharts map JavaScript
    highcharts_map = f"""
    (async () => {{
        const topology = await fetch(
            'https://code.highcharts.com/mapdata/countries/za/za-all.topo.json'
        ).then(response => response.json());

        Highcharts.mapChart('container', {{
            chart: {{
                map: topology,
                borderRadius: 10,
                backgroundColor: '#ffffffb3',
            }},

            title: {{
                text: 'Mentions by Location, in South Africa',
                align: 'center'
            }},

            credits: {{
                href: 'https://data.worldbank.org',
                mapText: 'Data source: Updated Social Media Mentions'
            }},

            mapNavigation: {{
                enabled: true,
                buttonOptions: {{
                    verticalAlign: 'bottom'
                }}
            }},

            colorAxis: {{
                min: 0
            }},

            series: [{{
                data: {json.dumps(mapped_data)},
                name: 'Mentions',
                joinBy: 'hc-key',
                states: {{
                    hover: {{
                        color: '#a4edba'
                    }}
                }},
                dataLabels: {{
                    enabled: true,
                    format: '{{point.name}}: {{point.value}} mentions'
                }}
            }}],

            tooltip: {{
                valueDecimals: 1,
                valueSuffix: ' mentions'
            }}

        }});

    }})();
    """
    map_col, dataframe_col = st.columns([8,2])
    with map_col:
        # Embed the Highcharts map in Streamlit
        components.html(
            f"""
            <div id="container" style="width:100%; height: 600px;"></div>
            <script src="https://code.highcharts.com/maps/highmaps.js"></script>
            <script src="https://code.highcharts.com/maps/modules/exporting.js"></script>
            <script src="https://code.highcharts.com/maps/modules/offline-exporting.js"></script>
            <script>{highcharts_map}</script>
            """,
            height=750,
        )
    with dataframe_col:
        def get_top_locations(data, target_company):
            locations = []
            if target_company in data:
                for mention in data[target_company]['mentions']:
                    location = mention.get('location')
                    if location:
                        locations.append(location)

            # Count occurrences of each location
            location_counts = Counter(locations)
            return location_counts
        location_counts = get_top_locations(data, target)

        # Create a DataFrame from the counts
        df_top_locations = pd.DataFrame(location_counts.items(), columns=["Top Locations", "Mentions"])

        # Sort the DataFrame by the number of mentions
        df_top_locations = df_top_locations.sort_values(by="Mentions", ascending=False)

        # Display the DataFrame in Streamlit
        st.dataframe(df_top_locations,
                 column_order=("Top Locations", "Mentions"),
                 hide_index=True,
                 width=None,
                 column_config={
                     "Top Locations": st.column_config.TextColumn(
                         "Top Locations",
                     ),
                     "Mentions": st.column_config.ProgressColumn(
                         "Mentions",
                         format="%d",
                         min_value=0,
                         max_value=max(df_top_locations.Mentions),
                     )}
                 )
        

@st.cache_data
def load_data():
    with open("data-sources/Mentions-Data.json") as file:
        data = json.load(file)
    return data

def generate_live_updates(data, speed=1):
    """
    Generator function to provide live updates.
    :param data: The loaded JSON data
    :param speed: Speed multiplier for updates (default is 1)
    """
    all_mentions = []
    for company in data.values():
        all_mentions.extend(company['mentions'])
    
    # Sort mentions by date
    all_mentions.sort(key=lambda x: x['date'])
    
    # Get the earliest and latest dates
    start_date = datetime.strptime(all_mentions[0]['date'], '%Y-%m-%d')
    end_date = datetime.strptime(all_mentions[-1]['date'], '%Y-%m-%d')
    
    current_date = start_date
    current_index = 0
    
    while current_date <= end_date:
        # Get all mentions for the current date
        current_mentions = [
            mention for mention in all_mentions[current_index:]
            if datetime.strptime(mention['date'], '%Y-%m-%d') <= current_date
        ]
        
        yield current_date, current_mentions
        
        current_index += len(current_mentions)
        current_date += timedelta(days=1)
        time.sleep(1 / speed)  # Adjust speed of updates

def display_live_updates(data, translations):
    st.title(translations["live_updates_title"])
    
    if 'running' not in st.session_state:
        st.session_state.running = False
    
    start_stop = st.button(translations["start_stop_button"])
    if start_stop:
        st.session_state.running = not st.session_state.running

    if st.session_state.running:
        st.markdown("""
        <style>
        .container {padding-top: 2rem;}
        .row {display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem;}
        .col {flex-basis: calc(50% - 1rem); margin-right: 1rem;}
        </style>
        """, unsafe_allow_html=True)

        container = st.container()

        with container:
            row1 = st.container()
            row2 = st.container()
            row3 = st.container()

            # Social Media Metrics
            with row1:
                st.subheader(translations["social_media_metrics"])
                metrics = [
                    (_("Mentions"), f"{data['mentions'].iloc[-1]:,}", f"{data['mentions'].pct_change().iloc[-1]*100:.2f}%"),
                    (_("Unique Users"), f"{data['unique_users'].iloc[-1]:,}", f"{data['unique_users'].pct_change().iloc[-1]*100:.2f}%"),
                    (_("Engagement Rate"), f"{data['engagement_rate'].iloc[-1]:.2f}%", f"+{data['engagement_rate'].pct_change().iloc[-1]*100:.2f}%"),
                    (_("Sentiment Score"), f"{data['sentiment_score'].iloc[-1]:.4f}", f"+{data['sentiment_score'].pct_change().iloc[-1]*100:.2f}%"),
                    (_("Total Users"), f"{data['total_users'].iloc[-1]:,}", f"+{data['total_users'].pct_change().iloc[-1]*100:.2f}%")
                ]
                for metric, value, delta in metrics:
                    st.metric(metric, value, delta)

            # Platform Performance
            with row2:
                st.subheader(translations["platform_performance"])
                platforms = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube']
                for platform in platforms:
                    st.metric(_(platform), f"{random.randint(500, 1500):,}", f"+{random.uniform(-5, 5):.2f}%")

            # Audience Insights
            with row3:
                st.subheader(translations["audience_insights"])
                total_users = data['total_users'].iloc[-1]
                age_groups = {
                    _("18 - 24 years"): data['age_group_1824'].iloc[-1],
                    _("25 - 40 years"): data['age_group_2530'].iloc[-1],
                    _("40 - 55 years"): data['age_group_4055'].iloc[-1],
                    _("55+ years"): data['age_group_5565plus'].iloc[-1]
                }
                
                # Create a pie chart for age groups
                chart_data = {
                    "labels": list(age_groups.keys()),
                    "values": list(age_groups.values()),
                    "colors": ["#FFD700", "#32CD32", "#FF8C00", "#4169E1"],
                    "title": translations["age_distribution_title"],
                    "showlegend": True,
                    "legend_title": translations["legend_title"]
                }
                
                # Display the pie chart
                pie_chart = create_pie_chart(chart_data)
                st.plotly_chart(pie_chart, use_container_width=True)

            # Add export options
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(export_csv(data), unsafe_allow_html=True)
            with col2:
                export_result = export_chart_as_png(pie_chart)
                if isinstance(export_result, str) and "kaleido" in export_result:
                    st.warning(export_result)
                else:
                    st.markdown(export_result, unsafe_allow_html=True)

        for date, updates in generate_live_updates(data, speed=1):
            if not st.session_state.running:
                break
            
            # Update metrics and charts here
            time.sleep(1)  # Update every second
    else:
        st.info(translations["info_message"])




# Get the path to your JSON file
json_file_path = os.path.join(os.getcwd(), "data-sources", "digital-ma-434202-d2311a8c7167.json")

try:
    # Load credentials
    credentials = service_account.Credentials.from_service_account_file(
        json_file_path,
        scopes=['https://www.googleapis.com/auth/cloud-platform']
    )

    # Initialize the translate client with the credentials
    client = translate.Client(credentials=credentials)

except FileNotFoundError:
    st.error(f"Service account JSON file not found at {json_file_path}. Please check the file path.")
    st.stop()
except Exception as e:
    st.error(f"An error occurred while setting up the Google Cloud client: {str(e)}")
    st.stop()

# Define available languages
LANGUAGES = {
    'English': 'en',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Italian': 'it',
    'Portuguese': 'pt',
    'Russian': 'ru',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Chinese (Simplified)': 'zh-CN',
    'Arabic': 'ar',
    'Hindi': 'hi',
    'Zulu': 'zu',
    'Xhosa': 'xh',
    'Afrikaans': 'af'
}

def translate_text(text, target_language):
    try:
        result = client.translate(text, target_language=target_language)
        return result['translatedText']
    except Exception as e:
        st.error(f"Translation error: {str(e)}")
        return text

def _(message):
    if st.session_state.lang != 'en':
        return translate_text(message, st.session_state.lang)
    return message

def load_translations(lang):
    translations = {
        "dashboard_title": _("Dashboard"),
        "overview": _("Overview"),
        "platform_specific_title": _("Platform Specific"),
        "platform_metrics": _("Platform Metrics"),
        "gen_ai_title": _("Gen AI"),
        "ai_insights": _("AI Insights"),
        "sentiment_analysis_title": _("Sentiment Analysis"),
        "sentiment_breakdown": _("Sentiment Breakdown"),
        "world_view_title": _("World View"),
        "global_reach": _("Global Reach"),
        "live_updates_title": _("Digital Media Analytics Live Updates"),
        "start_stop_button": _("Start/Stop Live Updates"),
        "social_media_metrics": _("Social Media Metrics"),
        "platform_performance": _("Platform Performance"),
        "audience_insights": _("Audience Insights"),
        "age_distribution_title": _("Age Group Distribution"),
        "legend_title": _("Age Groups"),
        "info_message": _("Click 'Start/Stop Live Updates' to begin"),
        "download_csv": _("Download CSV"),
        "download_chart": _("Download Chart"),
        "export_data": _("Export Data"),
        "export_chart": _("Export Chart"),
    
    }
    return translations

def load_data():
    # Replace this with your actual data loading logic
    df = pd.DataFrame({
        'mentions': [100, 200, 300],
        'unique_users': [80, 90, 95],
        'engagement_rate': [60, 62, 64],
        'sentiment_score': [0.7, 0.75, 0.8],
        'total_users': [800, 820, 840],
        'age_group_1824': [20, 22, 24],
        'age_group_2530': [45, 47, 49],
        'age_group_4055': [15, 17, 19],
        'age_group_5565plus': [10, 12, 14]
    })
    return df

def display_dashboard(data, translations):
    st.title(translations["dashboard_title"])
    st.subheader(translations["overview"])
    st.metric(_("Mentions"), f"{data['mentions'].iloc[-1]:,}", f"+{data['mentions'].pct_change().iloc[-1]*100:.2f}%")
    st.metric(_("Unique Users"), f"{data['unique_users'].iloc[-1]:,}", f"-{data['unique_users'].pct_change().iloc[-1]*100:.2f}%")
    st.metric(_("Engagement Rate"), f"{data['engagement_rate'].iloc[-1]:.2f}%", f"+{data['engagement_rate'].pct_change().iloc[-1]*100:.2f}%")
    st.metric(_("Sentiment Score"), f"{data['sentiment_score'].iloc[-1]:.4f}", f"+{data['sentiment_score'].pct_change().iloc[-1]*100:.2f}%")
    st.metric(_("Total Users"), f"{data['total_users'].iloc[-1]:,}", f"+{data['total_users'].pct_change().iloc[-1]*100:.2f}%")

    # Add export option for dashboard data
    st.markdown(export_csv(data), unsafe_allow_html=True)

def display_platform_specific(data, translations):
    st.title(translations["platform_specific_title"])
    st.subheader(translations["platform_metrics"])
    platforms = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube']
    for platform in platforms:
        st.metric(_(platform), f"{random.randint(500, 1500):,}", f"+{random.uniform(-5, 5):.2f}%")


  # Create a bar chart for platform performance
    platforms = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube']
    values = [random.randint(500, 1500) for _ in platforms]
    fig = go.Figure(data=[go.Bar(x=platforms, y=values)])
    fig.update_layout(title=translations["platform_performance"])
    
    st.plotly_chart(fig)
    
    # Add export options
    col1, col2 = st.columns(2)
    with col1:
        st.markdown(export_csv(pd.DataFrame({'Platform': platforms, 'Value': values})), unsafe_allow_html=True)
    with col2:
        st.markdown(export_chart_as_png(fig), unsafe_allow_html=True)


def display_gen_ai(data, translations):
    st.title(translations["gen_ai_title"])
    st.subheader(translations["ai_insights"])
    ai_insights = [
        (_("Improved Sentiment Analysis Accuracy"), f"{random.uniform(70, 85):.2f}%"),
        (_("Enhanced Topic Modeling Efficiency"), f"{random.uniform(30, 50):.2f}%"),
        (_("Increased Natural Language Processing Speed"), f"{random.uniform(20, 40):.2f}%")
    ]
    for insight, improvement in ai_insights:
        st.metric(insight, improvement)

def display_sentiment_analysis(data, translations):
    st.title(translations["sentiment_analysis_title"])
    st.subheader(translations["sentiment_breakdown"])
    sentiments = [_('Positive'), _('Negative'), _('Neutral')]
    for sentiment in sentiments:
        st.metric(sentiment, f"{random.randint(100, 500):,}", f"{random.uniform(-5, 5):.2f}%")

def display_world_view(data, translations):
    st.title(translations["world_view_title"])
    st.subheader(translations["global_reach"])
    countries = [_('USA'), _('UK'), _('Germany'), _('France'), _('Australia')]
    for country in countries:
        st.metric(country, f"{random.randint(100000, 500000):,}", f"{random.uniform(-5, 5):.2f}%")

def display_live_updates(data, translations):
    st.title(translations["live_updates_title"])
    
    if 'running' not in st.session_state:
        st.session_state.running = False
    
    start_stop = st.button(translations["start_stop_button"])
    if start_stop:
        st.session_state.running = not st.session_state.running

    if st.session_state.running:
        st.markdown("""
        <style>
        .container {padding-top: 2rem;}
        .row {display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem;}
        .col {flex-basis: calc(50% - 1rem); margin-right: 1rem;}
        </style>
        """, unsafe_allow_html=True)

        container = st.container()

        with container:
            row1 = st.container()
            row2 = st.container()
            row3 = st.container()

            # Social Media Metrics
            with row1:
                st.subheader(translations["social_media_metrics"])
                metrics = [
                    (_("Mentions"), f"{data['mentions'].iloc[-1]:,}", f"{data['mentions'].pct_change().iloc[-1]*100:.2f}%"),
                    (_("Unique Users"), f"{data['unique_users'].iloc[-1]:,}", f"{data['unique_users'].pct_change().iloc[-1]*100:.2f}%"),
                    (_("Engagement Rate"), f"{data['engagement_rate'].iloc[-1]:.2f}%", f"+{data['engagement_rate'].pct_change().iloc[-1]*100:.2f}%"),
                    (_("Sentiment Score"), f"{data['sentiment_score'].iloc[-1]:.4f}", f"+{data['sentiment_score'].pct_change().iloc[-1]*100:.2f}%"),
                    (_("Total Users"), f"{data['total_users'].iloc[-1]:,}", f"+{data['total_users'].pct_change().iloc[-1]*100:.2f}%")
                ]
                for metric, value, delta in metrics:
                    st.metric(metric, value, delta)

            # Platform Performance
            with row2:
                st.subheader(translations["platform_performance"])
                platforms = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube']
                for platform in platforms:
                    st.metric(_(platform), f"{random.randint(500, 1500):,}", f"+{random.uniform(-5, 5):.2f}%")

            # Audience Insights
            with row3:
                st.subheader(translations["audience_insights"])
                total_users = data['total_users'].iloc[-1]
                age_groups = {
                    _("18 - 24 years"): data['age_group_1824'].iloc[-1],
                    _("25 - 40 years"): data['age_group_2530'].iloc[-1],
                    _("40 - 55 years"): data['age_group_4055'].iloc[-1],
                    _("55+ years"): data['age_group_5565plus'].iloc[-1]
                }
                
                # Create a pie chart for age groups
                chart_data = {
                    "labels": list(age_groups.keys()),
                    "values": list(age_groups.values()),
                    "colors": ["#FFD700", "#32CD32", "#FF8C00", "#4169E1"],
                    "title": translations["age_distribution_title"],
                    "showlegend": True,
                    "legend_title": translations["legend_title"]
                }
                
                # Create and display the pie chart
                pie_chart = create_pie_chart(chart_data)
                st.plotly_chart(pie_chart, use_container_width=True)

            # Add export options
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(export_csv(data), unsafe_allow_html=True)
            with col2:
                st.markdown(export_chart_as_png(pie_chart), unsafe_allow_html=True)

        for date, updates in generate_live_updates(data, speed=1):
            if not st.session_state.running:
                break
            
            # Update metrics and charts here
            time.sleep(1)  # Update every second
    else:
        st.info(translations["info_message"])


def create_pie_chart(data):
    fig = go.Figure(data=[go.Pie(labels=data['labels'], values=data['values'])])
    fig.update_layout(title=data['title'])
    fig.update_traces(hole=.3)
    fig.update_layout(legend=dict(yanchor="top", y=0.99, xanchor="right", x=1.05))
    return fig

def generate_live_updates(data, speed=1):
    current_time = datetime.now()
    for hour in range(24):
        yield (current_time.strftime("%H:%M"), {
            'mentions': random.randint(900, 1100),
            'unique_users': random.randint(750, 950),
            'engagement_rate': random.uniform(63, 67),
            'sentiment_score': random.uniform(0.74, 0.76),
            'total_users': random.randint(810, 850),
            'age_group_1824': random.randint(21, 23),
            'age_group_2530': random.randint(46, 48),
            'age_group_4055': random.randint(15, 17),
            'age_group_5565plus': random.randint(10, 12)
        })
        time.sleep(speed * 3600)  # Sleep for 1 hour

def main():
    # Load data
    data = load_data()

    # Initialize session state
    if 'lang' not in st.session_state:
        st.session_state.lang = 'en'

    # Add language selection to the sidebar
    st.sidebar.title(_("Language Settings"))
    selected_language = st.sidebar.selectbox(
        _("Select your preferred language"),
        options=list(LANGUAGES.keys()),
        index=list(LANGUAGES.values()).index(st.session_state.lang)
    )

    # Update the session state with the selected language
    st.session_state.lang = LANGUAGES[selected_language]

    # Load translations
    translations = load_translations(st.session_state.lang)

    # Define a dictionary to map option names to corresponding functions
    display_functions = {
      
        _("Live Updates"): display_live_updates,
       
    }

    # Get selected option
    options = st.selectbox(
        _("Select a module:"),
        options=list(display_functions.keys())
    )

    # Call the appropriate function based on the selected option
    display_functions[options](data, translations)



def create_download_button(object_to_download, download_filename, button_text):
  
    if isinstance(object_to_download, pd.DataFrame):
        object_to_download = object_to_download.to_csv(index=False)
    
    # Create a BytesIO buffer
    b64 = base64.b64encode(object_to_download.encode()).decode()
    
    button_uuid = str(uuid.uuid4()).replace('-', '')
    button_id = re.sub('\d+', '', button_uuid)

    custom_css = f"""
        <style>
            #{button_id} {{
                background-color: rgb(255, 255, 255);
                color: rgb(38, 39, 48);
                padding: 0.25em 0.38em;
                position: relative;
                text-decoration: none;
                border-radius: 4px;
                border-width: 1px;
                border-style: solid;
                border-color: rgb(230, 234, 241);
                border-image: initial;
            }}
            #{button_id}:hover {{
                border-color: rgb(246, 51, 102);
                color: rgb(246, 51, 102);
            }}
            #{button_id}:active {{
                box-shadow: none;
                background-color: rgb(246, 51, 102);
                color: white;
                }}
        </style> """

    dl_link = custom_css + f'<a download="{download_filename}" id="{button_id}" href="data:file/txt;base64,{b64}">{button_text}</a><br></br>'
    
    return dl_link


def display_report(data, translations):
    st.title(_("Report Generation and Scheduling"))
    
    # Report Generation
    st.header(_("Generate Report"))
    report_type = st.selectbox(_("Select Report Type"), ["Full Report", "Summary Report", "Custom Report"])
    
    if st.button(_("Generate Report")):
        report = generate_report(data, report_type)
        st.text_area(_("Generated Report"), report, height=300)
        st.markdown(export_csv(pd.DataFrame({'Report': [report]}), filename="social_media_report.csv", button_text=_("Download Report as CSV")), unsafe_allow_html=True)

    # Report Scheduling
    st.header(_("Schedule Automated Reports"))
    
    recipient_email = st.text_input(_("Enter recipient email address"))
    sender_email = st.text_input(_("Enter your email address"))
    sender_password = st.text_input(_("Enter your email password"), type="password")
    email_provider = st.selectbox(_("Select your email provider"), list(EMAIL_PROVIDERS.keys()))
    frequency = st.selectbox(_("Select report frequency"), ["Daily", "Weekly", "Monthly"])
    
    if st.button(_("Schedule Reports")):
        if recipient_email and sender_email and sender_password and email_provider:
            schedule_report(recipient_email, frequency, sender_email, sender_password, email_provider)
            st.success(_("Reports scheduled to be sent {frequency} to {recipient_email}").format(frequency=frequency.lower(), recipient_email=recipient_email))
        else:
            st.error(_("Please fill in all fields"))

    # Display scheduled reports
    st.header(_("Scheduled Reports"))
    if scheduled_reports:
        for i, report in enumerate(scheduled_reports):
            st.write(f"{i+1}. To: {report['email']}, Frequency: {report['frequency']}, Next Run: {report['next_run']}")
    else:
        st.write(_("No reports scheduled"))


def generate_report(data, report_type):
    if report_type == "Full Report":
        report = "Full Social Media Analytics Report\n\n"
        for column in data.columns:
            report += f"{column}:\n"
            for value in data[column]:
                report += f"  {value}\n"
            report += "\n"
    elif report_type == "Summary Report":
        report = "Summary Social Media Analytics Report\n\n"
        for column in data.columns:
            report += f"{column}: {data[column].mean():.2f} (average)\n"
    else:  # Custom Report
        report = "Custom Social Media Analytics Report\n\n"
        # Add custom logic here based on your requirements
    
    return report

# Global variables
scheduled_reports = []

# Email provider configurations
EMAIL_PROVIDERS = {
    'Gmail': {'smtp_server': 'smtp.gmail.com', 'smtp_port': 587},
    'Outlook': {'smtp_server': 'smtp-mail.outlook.com', 'smtp_port': 587},
    'Yahoo': {'smtp_server': 'smtp.mail.yahoo.com', 'smtp_port': 587},
    # Add more providers as needed
}

def schedule_report(email, frequency, sender_email, sender_password, email_provider):
    now = datetime.now()
    if frequency == 'Daily':
        next_run = now.replace(hour=8, minute=0, second=0, microsecond=0) + timedelta(days=1)
    elif frequency == 'Weekly':
        days_ahead = 7 - now.weekday()
        next_run = now.replace(hour=8, minute=0, second=0, microsecond=0) + timedelta(days=days_ahead)
    elif frequency == 'Monthly':
        if now.month == 12:
            next_run = now.replace(year=now.year+1, month=1, day=1, hour=8, minute=0, second=0, microsecond=0)
        else:
            next_run = now.replace(month=now.month+1, day=1, hour=8, minute=0, second=0, microsecond=0)
    
    scheduled_reports.append({
        'email': email,
        'frequency': frequency,
        'next_run': next_run,
        'sender_email': sender_email,
        'sender_password': sender_password,
        'email_provider': email_provider
    })

def send_email(recipient, subject, body, sender_email, sender_password, email_provider):
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(EMAIL_PROVIDERS[email_provider]['smtp_server'], 
                              EMAIL_PROVIDERS[email_provider]['smtp_port'])
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, recipient, text)
        server.quit()
        print(f"Email sent successfully to {recipient}")
    except Exception as e:
        print(f"Failed to send email: {str(e)}")

def run_scheduler():
    while True:
        now = datetime.now()
        for report in scheduled_reports:
            if now >= report['next_run']:
                send_scheduled_report(report['email'], report['sender_email'], 
                                      report['sender_password'], report['email_provider'])
                if report['frequency'] == 'Daily':
                    report['next_run'] += timedelta(days=1)
                elif report['frequency'] == 'Weekly':
                    report['next_run'] += timedelta(days=7)
                elif report['frequency'] == 'Monthly':
                    if report['next_run'].month == 12:
                        report['next_run'] = report['next_run'].replace(year=report['next_run'].year+1, month=1)
                    else:
                        report['next_run'] = report['next_run'].replace(month=report['next_run'].month+1)
        time.sleep(60)  # Check every minute

def send_scheduled_report(email, sender_email, sender_password, email_provider):
    data = load_data()  # Your function to load the latest data
    report = generate_report(data, "Full Report")  # Assuming you want to send a full report
    send_email(email, "Your Scheduled Social Media Analytics Report", report, 
               sender_email, sender_password, email_provider)

# Start the scheduler in a separate thread
scheduler_thread = threading.Thread(target=run_scheduler)
scheduler_thread.start()

def load_translations(lang):
    translations = {
        "dashboard_title": _("Dashboard"),
        "overview": _("Overview"),
        "platform_specific_title": _("Platform Specific"),
        "platform_metrics": _("Platform Metrics"),
        "gen_ai_title": _("Gen AI"),
        "ai_insights": _("AI Insights"),
        "sentiment_analysis_title": _("Sentiment Analysis"),
        "sentiment_breakdown": _("Sentiment Breakdown"),
        "world_view_title": _("World View"),
        "global_reach": _("Global Reach"),
        "live_updates_title": _("Digital Media Analytics Live Updates"),
        "start_stop_button": _("Start/Stop Live Updates"),
        "social_media_metrics": _("Social Media Metrics"),
        "platform_performance": _("Platform Performance"),
        "audience_insights": _("Audience Insights"),
        "age_distribution_title": _("Age Group Distribution"),
        "legend_title": _("Age Groups"),
        "info_message": _("Click 'Start/Stop Live Updates' to begin"),
        "download_csv": _("Download CSV"),
        "download_chart": _("Download Chart"),
        "export_data": _("Export Data"),
        "export_chart": _("Export Chart"),
        "report_generation_title": _("Report Generation and Scheduling"),
        "generate_report": _("Generate Report"),
        "select_report_type": _("Select Report Type"),
        "download_report": _("Download Report as CSV"),
        "schedule_reports": _("Schedule Automated Reports"),
        "scheduled_reports": _("Scheduled Reports"),
        "no_reports_scheduled": _("No reports scheduled"),
        "mentions": _("Mentions"),
        "unique_users": _("Unique Users"),
        "engagement_rate": _("Engagement Rate"),
        "sentiment_score": _("Sentiment Score"),
        "total_users": _("Total Users"),
    }
    return translations



def generate_report(data, report_type):
    if report_type == "Full Report":
        report = "Full Social Media Analytics Report\n\n"
        for column in data.columns:
            report += f"{column}:\n"
            for value in data[column]:
                report += f"  {value}\n"
            report += "\n"
    elif report_type == "Summary Report":
        report = "Summary Social Media Analytics Report\n\n"
        for column in data.columns:
            report += f"{column}: {data[column].mean():.2f} (average)\n"
    else:  # Custom Report
        report = "Custom Social Media Analytics Report\n\n"
       
    
    return report


if __name__ == "__main__":
    main()